import { useEffect, useRef, useState } from 'react'

export function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true)
          observador.unobserve(elemento)
        }
      },
      { threshold },
    )

    observador.observe(elemento)
    return () => observador.disconnect()
  }, [threshold])

  return [ref, visivel]
}
