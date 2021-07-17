import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";
import { AuthTokenError } from "./errors/AuthTokenError";

let isRefreshing = false;
let failedRequestsQueue = [];
// No momento de refresh do token, as requisições que são disparadas junto com o refresh
// Irão falhar, pois essas agora ainda não possuem o novo token atualizado.
// Iremos então, 'pausá-las' e após o refresh do token ser executado
// iremos então finaliza-las.

export function setupAPIclient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["nextauth.token"]}`,
    },
  });

  // As funções acima irão executar somente quando o usuário abrir a tela
  // pela primeira vez, ou seja, quando ele fizer o login

  // Há uma maneira no axios de sempre interceptar requisições ou respostas
  // Para execurar funções antes das mesmas serem feitas ou recebidas.

  // Essa função abaixo irá ser executada sempre que houver uma requisição,

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === "token.expired") {
          // renovar o token
          // pegar o valor atualizado do token
          cookies = parseCookies(ctx);
          // pegar o refreshtoken de dentro dos cookies, arpoveitando a variavel que ja foi declarada acima
          const { "nextauth.refreshToken": refreshToken } = cookies;
          // Executar um post em uma rota criada pelo backend, no qual irá ser
          // enviado o refreshToken e retornado na resposta do post, o novo token
          // e novo valor do refreshToken

          const originalConfig = error.config; // Dentro do config existe todas as informações
          // das requisições que foram failure devido ao token expirado.

          if (!isRefreshing) {
            isRefreshing = true;

            // QUando ocorre de mais de uma requisição ser feita ao atualizar a página, e o token estiver
            // Expirado, cada uma irá disparar uma requisição de refresh do token
            // Como queremos que somente uma seja disparada, iremos fazer essa verificação
            // Na qual o refresh irá ser executado somente quando isRefreshing for falso, após
            // o começo do refresh iremos setar o isrefreshing como true, e as próximas requisições
            // de refresh não serão executadas.

            api
              .post("/refresh", {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, "nextauth.token", token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: "/", // colocando o / siginifica que qualquer endereço da aplicação terá acesso ao cookie.
                });
                setCookie(
                  ctx,
                  "nextauth.refreshToken",
                  response.data.refreshToken, // novo valor do refresh token
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: "/", // colocando o / siginifica que qualquer endereço da aplicação terá acesso ao cookie.
                  }
                );

                api.defaults.headers["Authorization"] = `Bearer ${token}`;
                // Atualizar o novo token default das requisições

                failedRequestsQueue.forEach((request) =>
                  request.onSuccess(token)
                );
                failedRequestsQueue = [];
                // irá executar todas as requests novamente como declarado abaixo.
              })
              .catch((err) => {
                failedRequestsQueue.forEach((request) =>
                  request.onFailure(err)
                );
                failedRequestsQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
                // Após o refresh ser executado e finalizado, voltaremos o isRefreshing para false,
                // Para que a próxima atualizada do token ocorra da mesma maneira.
              });
          }
          // A unica maneira de realizar uma função assincrona dentro do
          // interceptors é utilizando a estrategia do new Promise.
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers["Authorization"] = `Bearer ${token}`;
                // Salvando o novo valor do token no headers das requisições falhas.
                resolve(api(originalConfig));
                // Como uma func async await, usando essa metodologia do new Promise,
                // Contida justamente dentro da documentação do axios, a new Promise irá ser
                // finalizada quando executar novamente as chamadas dentro do originalConfig.
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          // quando status 401 e erro não é de token expirado, deslogar usuário
          if (process.browser) {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError());
          }
        }
      }
      return Promise.reject(error);
      // caso não caia em nenhum das condições eu retorno o erro, para a tratativa dentro do
      // catch da chamada.
    }
  );

  // Esse é o tipo de código que não se decora, você tem que entender o que está acontecendo aqui
  // Salvar esse código no gist do seu github. E sempre que criar um a aplicação com autheticação
  // Com refresh token, copia-lo novamente.

  return api;
}
