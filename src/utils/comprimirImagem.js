export function comprimirImagem(arquivo, larguraMaxima = 1000, qualidade = 0.8) {
  return new Promise((resolve) => {
    const leitor = new FileReader()
    leitor.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let largura = img.width
        let altura = img.height

        if (largura > larguraMaxima) {
          altura = (altura * larguraMaxima) / largura
          largura = larguraMaxima
        }

        canvas.width = largura
        canvas.height = altura
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, largura, altura)

        canvas.toBlob(
          (blob) => {
            const arquivoComprimido = new File([blob], arquivo.name, { type: 'image/jpeg' })
            resolve(arquivoComprimido)
          },
          'image/jpeg',
          qualidade
        )
      }
      img.src = e.target.result
    }
    leitor.readAsDataURL(arquivo)
  })
}