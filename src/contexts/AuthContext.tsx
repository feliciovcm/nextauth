import { createContext, ReactNode, useEffect, useState } from "react";
import Router from "next/router";
import { setCookie, parseCookies, destroyCookie } from "nookies";
import { api } from "../services/apiClient";

type SignInCredentials = {
  email: string;
  password: string;
};

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function signOut() {
  destroyCookie(undefined, "nextauth.token");
  destroyCookie(undefined, "nextauth.refreshToken");

  Router.push("/");
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>(null);

  // booleano que diz se usuario é autheticado ou não
  const isAuthenticated = !!user;

  useEffect(() => {
    const { "nextauth.token": token } = parseCookies();

    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data;
          setUser({ email, permissions, roles });
        })
        .catch((error) => {
          signOut();
        });
      // Toda vez, que houver um refresh na pagina, o authcontext irá dar uma get na rota /me
      // Irá verificar se o usuario está autenticado. Se não estiver e o erro for de refreshtoken
      // A rota será interceptada pelo axios, como tratado no arquivo api.ts. Agora se ocorrer
      // QUalquer outro tipo de erro, o catch irá pegar esse erro, irá destruir os cookies e
      // irá redirecionar o usuário para a rota de login.
    }
  }, []);

  async function signIn({ email, password }: SignInCredentials) {
    // função que será executada quando o usuario clicar em login, enviando assim
    // seu email e senha, para checagem do backend e geração do token.
    // Usar try catch para verificar se o usuario existe ou não
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      // sessionStorage : Não fica disponível em outras sessões. Ou seja, fechou o navegador
      // e abriu denovo, perde o sessionStorage

      // localStorage: A criação da interface não é feita somente pelo lado do browser
      // no caso do next, e o localstorage só existe do lado do cliente(browser)

      //cookies: Melhor opção de armazenar informações, para ser utilizada entre paginas
      // pode ser utilizada tanto do lado do browser quanto do servidos node do next

      setCookie(undefined, "nextauth.token", token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/", // colocando o / siginifica que qualquer endereço da aplicação terá acesso ao cookie.
      });
      setCookie(undefined, "nextauth.refreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/", // colocando o / siginifica que qualquer endereço da aplicação terá acesso ao cookie.
      });

      // O primeiro parâmetro deve ser undefined pois essa ação de setar os cookies
      // será feita somente pelo lado do browser. Como a execução dessa linha de
      // código depende de uma ação do usuário, a ação de singin, logo é uma ação
      // feita pelo lado do cliente, e assim o primeiro parametro deve ser undefined.

      setUser({
        email,
        permissions,
        roles,
      });

      api.defaults.headers["Authorization"] = `Bearer ${token}`;

      Router.push("/dashboard");
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, user }}>
      {children}
    </AuthContext.Provider>
  );
}
