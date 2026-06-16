# Fotos por upload — configurar o Cloudinary (grátis)

O upload de fotos no backoffice usa o Cloudinary (plano grátis, sem cartão).
São precisos 2 valores que colas nas variáveis de ambiente do Render.

## Passos
1. Cria conta em **cloudinary.com** (grátis).
2. No painel, no canto, encontra o **Cloud name** (algo como `dxxxxxx`). Guarda-o.
3. Cria um **Upload preset** sem assinatura:
   - **Settings** (engrenagem) → **Upload** → secção **Upload presets** → **Add upload preset**.
   - Em **Signing Mode** escolhe **Unsigned**.
   - (Opcional, recomendado) em **Folder** escreve `sara-maia` para organizar as fotos.
   - Guarda e copia o **nome do preset** (ex.: `ml_default` ou o que definires).
4. No Render → app web → **Environment**, preenche:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    = o teu Cloud name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = o nome do preset Unsigned
   ```
5. Guarda. O Render reinicia e o botão **"+ Carregar fotos"** no backoffice fica ativo.

## Notas
- Enquanto não configurares, o backoffice deixa-te na mesma **colar um link** de imagem.
- As imagens ficam alojadas no Cloudinary; o site guarda apenas o link de cada foto.
- O domínio `res.cloudinary.com` já está autorizado no `next.config.mjs`.
