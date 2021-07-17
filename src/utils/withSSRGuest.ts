import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";
import { parseCookies } from "nookies";

// O motivo do <P> é somente para ter as tipagens do gerServerSidePropsResults

export function withSSRGuest<P>(fn: GetServerSideProps<P>) {
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx); // Como o parse cookies agora está sendo executado pelo lado
    // do servidor node, o primeiro parametro não é mais undefined, e sim o ctx do getserversideprops;

    if (cookies["nextauth.token"]) {
      return {
        redirect: {
          destination: "/dashboard", // se existir um token valido ou expirado com refresh token valido, irá ser redirecionado para o dashboard.
          permanent: false,
        },
      };
    }

    return await fn(ctx);
  };
}

// Pq essa função recebe uma função como parâmetro e ainda retorna outra função?
// Pq o ssr dio getserversideprops, espera uma função, logo temos que retornar uma função,
// e o parametro seria a função passada no ssr do index por ex.
