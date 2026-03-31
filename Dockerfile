# Usa uma imagem leve do Nginx para servir arquivos estáticos
FROM nginx:alpine

# Copia os arquivos do seu front para a pasta padrão do Nginx
COPY . /usr/share/nginx/html

# Expõe a porta 80 (padrão do HTTP)
EXPOSE 80