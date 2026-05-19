/**
 * Registra os módulos do Chart.js usados na tela de Relatórios
 * e exporta os componentes vue-chartjs (Line, Bar, Doughnut).
 */
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
)

ChartJS.defaults.font.family =
  "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
ChartJS.defaults.color = '#6b7280'

export { Line, Bar, Doughnut }
