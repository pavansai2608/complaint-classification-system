import axios from 'axios'

// Needed so the browser sends/receives the httpOnly refresh-token cookie.
const apiClient = axios.create({ withCredentials: true })

export default apiClient
