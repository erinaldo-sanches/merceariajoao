const express = require("express");
const auth = require("../auth");
const { sequelize, User, Product, Client, Sale, SaleItem } = require("../models");

const router = express.Router()

// ======================
// 4) VENDAS (RF003/RF004)
// ======================
// body exemplo:
// {
//   "clientId": "uuid ou null",
//   "paymentType": "CASH" | "CARD" | "CREDIT",
//   "items": [{ "productId":"uuid", "qty":2 }]
// }
router.post("/sales", auth, async (req, res) => {
  const { clientId, paymentType, items } = req.body;

  if (!paymentType || !items || items.length === 0)
    return res.status(400).json({ message: "Dados incompletos." });

  // se for fiado, precisa de cliente
  let client = null;
  if (paymentType === "CREDIT") {
    if (!clientId) return res.status(400).json({ message: "Fiado exige cliente." });
    client = await Client.findByPk(clientId);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado." });
  }

  // transação: ou faz tudo, ou não faz nada
  const result = await sequelize.transaction(async (t) => {
    let total = 0;

    // 1) validar estoque + calcular total
    const productsCache = {};

    for (const it of items) {
      const product = await Product.findByPk(it.productId, { transaction: t });
      if (!product) throw new Error("Produto não encontrado.");

      if (product.stockQty < it.qty) throw new Error("Estoque insuficiente.");

      productsCache[it.productId] = product;
      total += Number(product.price) * Number(it.qty);
    }

    // 2) se fiado, validar limite
    if (paymentType === "CREDIT") {
      const newDebt = Number(client.debtBalance) + total;
      if (newDebt > Number(client.creditLimit)) {
        throw new Error("Ultrapassa limite de fiado.");
      }
    }

    // 3) criar venda
    const sale = await Sale.create(
      { UserId: req.user.id, ClientId: clientId || null, paymentType, total },
      { transaction: t }
    );

    // 4) criar itens e baixar estoque
    for (const it of items) {
      const product = productsCache[it.productId];

      await SaleItem.create(
        {
          SaleId: sale.id,
          ProductId: product.id,
          qty: it.qty,
          unitPrice: product.price
        },
        { transaction: t }
      );

      product.stockQty = product.stockQty - it.qty;
      await product.save({ transaction: t });
    }

    // 5) atualizar dívida do cliente (fiado)
    if (paymentType === "CREDIT") {
      client.debtBalance = Number(client.debtBalance) + total;
      await client.save({ transaction: t });
    }

    return sale;
  }).catch((err) => {
    return { error: err.message };
  });

  if (result.error) return res.status(400).json({ message: result.error });
  res.status(201).json(result);
});

// ======================
// RELATÓRIO DE VENDAS
// ======================
// Exemplos:
// GET /reports/sales?groupBy=day
// GET /reports/sales?groupBy=month
// GET /reports/sales?groupBy=year
router.get("/reports/sales", auth, async (req, res) => {
  try {
    const { groupBy = "day" } = req.query;

    if (!["day", "month", "year"].includes(groupBy)) {
      return res.status(400).json({
        message: "groupBy deve ser: day, month ou year."
      });
    }
    // Relatório de quantidade de vendas + faturamento
    const salesReport = await sequelize.query(
      `
      SELECT
        date_trunc(:groupBy, "createdAt") AS periodo,
        COUNT(*) AS "quantidadeVendas",
        COALESCE(SUM(total), 0) AS "faturamento"
      FROM "Sales"
      GROUP BY date_trunc(:groupBy, "createdAt")
      ORDER BY date_trunc(:groupBy, "createdAt") ASC
      `,
      {
        replacements: { groupBy },
        type: QueryTypes.SELECT
      }
    );
    // Relatório de itens vendidos
    const itemsReport = await sequelize.query(
      `
      SELECT
        date_trunc(:groupBy, s."createdAt") AS periodo,
        COALESCE(SUM(si.qty), 0) AS "itensVendidos"
      FROM "SaleItems" si
      INNER JOIN "Sales" s
        ON s.id = si."SaleId"
      GROUP BY date_trunc(:groupBy, s."createdAt")
      ORDER BY date_trunc(:groupBy, s."createdAt") ASC
      `,
      {
        replacements: { groupBy },
        type: QueryTypes.SELECT
      }
    );
    // Transformar itemsReport em mapa para juntar com salesReport
    const itemsMap = {};
    for (const item of itemsReport) {
      itemsMap[String(item.periodo)] = Number(item.itensVendidos);
    }
    const finalReport = salesReport.map((sale) => ({
      periodo: sale.periodo,
      quantidadeVendas: Number(sale.quantidadeVendas),
      itensVendidos: itemsMap[String(sale.periodo)] || 0,
      faturamento: Number(sale.faturamento)
    }));
    return res.json(finalReport);
  } catch (err) {
    return res.status(500).json({
      message: "Erro ao gerar relatório.",
      error: err.message
    });
  }
});

// ver venda
router.get("/sales/:id", auth, async (req, res) => {
  const sale = await Sale.findByPk(req.params.id, { include: [SaleItem] });
  if (!sale) return res.status(404).json({ message: "Venda não existe." });
  res.json(sale);
});

module.exports = router