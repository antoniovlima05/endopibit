# endometriose-sys
Sistema de integração de modelos de IA para utilização em imagens de endometriose.

### Setup

Entre em backend/app:
`cd backend/app/`

Crie um ambiente virtual nomeado "endoSysVenv" com a ferramenta de sua preferência:

> Exemplo com virtualenv

`virtualenv endoSysVenv`

Acesse o ambiente virtual:

> Linux - `source endoSysVenv/bin/activate`

> Windows (CMD) - `endoSysVenv/Scripts/activate`

> Windows (Powershell) - `endoSysVenv/Scripts/Activate.ps1`

Instale os pacotes presentes no arquivo `requirements.txt`

`pip install -r requirements.txt`

Vá para a pasta do projeto NextJS no frontend:

> `cd ../../frontend/endometriose-sys`

Execute os scripts para iniciar o front e back em terminais diferentes:

> `npm run dev` - frontend

> `npm run api` - backend

Se tudo correu bem, o projeto deve estar rodando normalmente.
Abra `localhost:3000` no navegador para acessar o frontend.
