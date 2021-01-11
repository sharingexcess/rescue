import { useEffect, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'

export function ExternalLink({ url, children }) {
  return (
    <a target="_blank" rel="noreferrer" href={url}>
      {children}
    </a>
  )
}

export function GoBack({ url, label = 'go back' }) {
  const history = useHistory()
  return url ? (
    <Link className="back" to={url}>
      {'< '}
      {label}
    </Link>
  ) : (
    <div className="back" onClick={() => history.goBack()}>
      {'< '}
      {label}
    </div>
  )
}

export default function Ellipsis({ style }) {
  const [text, setText] = useState('.')

  useEffect(() => {
    const int = window.setInterval(() => {
      setText(text.length === 3 ? '.' : text + '.')
    }, 400)
    return () => window.clearInterval(int)
  }, [text])

  return (
    <div
      style={{
        display: 'inline-block',
        width: '1.1rem',
        textAlign: 'left',
        ...style,
      }}
    >
      {text}
    </div>
  )
}
