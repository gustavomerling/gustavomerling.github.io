import { useState } from 'react'
import logoUrl from '../assets/logo.png'
import './LoginScreen.css'

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email && password) {
      onLogin()
    }
  }

  return (
    <div className="login-container">
      {/* Background with animated spheres */}
      <div className="login-background">
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
        <div className="sphere sphere-4"></div>
        <div className="gradient-overlay"></div>
      </div>

      {/* Login Card */}
      <div className="login-card">
        <div className="login-header">
          <img
            src={logoUrl}
            alt="Logo Encantalar"
            className="logo-img"
          />
          <p className="text-gray-600 text-sm">
            Calculadora de Quadros
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
            />
          </div>

          <button type="submit" className="form-button">
            Entrar
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm text-gray-600">
            Tela fictícia para demo • Qualquer email/senha funciona
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
