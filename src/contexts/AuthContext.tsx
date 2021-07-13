import { createContext, ReactNode, useState } from "react";
import Router from 'next/router'
import { api } from "../services/api";

type SignInCredentials = {
  email: string;
  password: string;
};

type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState(null);

  // booleano que diz se usuario é autheticado ou não
  const isAuthenticated = false;

  async function signIn({ email, password }: SignInCredentials) {
    // função que será executada quando o usuario clicar em login, enviando assim
    // seu email e senha, para checagem do backend e geração do token.
    // Usar try catch para verificar se o usuario existe ou não
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { permissions, roles } = response.data;

      setUser({
        email,
        permissions,
        roles
      });

      Router.push('/dashboard');
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
