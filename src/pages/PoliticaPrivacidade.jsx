import { Link } from 'react-router-dom'
import './PoliticaPrivacidade.css'

function PoliticaPrivacidade() {
  return (
    <div className="rz-politica-root">
      <header className="rz-topbar">
        <Link to="/" className="rz-logo-text" style={{ textDecoration: 'none' }}>
          Re<span>Z</span>enha
        </Link>
      </header>

      <div className="rz-politica-conteudo">
        <div className="rz-divider"></div>
        <h1>Política de Privacidade</h1>
        <p className="rz-politica-atualizado">Última atualização: julho de 2026</p>

        <h2>1. Quem somos</h2>
        <p>
          Este site pertence à Rezenha Barbearia, localizada em Santa Maria, RS. Esta página explica quais dados coletamos, para que usamos
          e como você pode exercer seus direitos.
        </p>

        <h2>2. Quais dados coletamos</h2>
        <p>
          Ao usar o site para agendar um horário ou criar uma conta, podemos coletar: nome, telefone (WhatsApp), e-mail e o histórico de
          agendamentos (barbeiro, serviço, data e horário escolhidos).
        </p>

        <h2>3. Para que usamos seus dados</h2>
        <p>Usamos essas informações para:</p>
        <ul>
          <li>Confirmar e gerenciar seus agendamentos</li>
          <li>Enviar e-mails de confirmação de presença</li>
          <li>Identificar você em atendimentos futuros e manter seu histórico com a barbearia</li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          Usamos apenas cookies essenciais ao funcionamento do site, como manter você conectado após o login. Não usamos cookies de
          rastreamento ou publicidade de terceiros.
        </p>

        <h2>5. Compartilhamento de dados</h2>
        <p>
          Seus dados não são vendidos nem compartilhados com terceiros para fins de marketing. As informações ficam armazenadas com o
          provedor de infraestrutura do site (Supabase) e são usadas exclusivamente para o funcionamento do agendamento.
        </p>

        <h2>6. Seus direitos</h2>
        <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você pode a qualquer momento solicitar:</p>
        <ul>
          <li>Acesso aos dados que temos sobre você</li>
          <li>Correção de dados incorretos ou desatualizados</li>
          <li>Exclusão dos seus dados do nosso sistema</li>
        </ul>
        <p>Para exercer qualquer um desses direitos, entre em contato diretamente com a barbearia.</p>

        <h2>7. Contato</h2>
        <p>Dúvidas sobre esta política podem ser tiradas diretamente com a barbearia, pelo WhatsApp disponível no site.</p>

        <Link to="/" className="rz-politica-voltar">
          ‹ Voltar para o início
        </Link>
      </div>
    </div>
  )
}

export default PoliticaPrivacidade
