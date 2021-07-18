import { destroyCookie } from "nookies";
import { useContext, useEffect } from "react";
import { Can } from "../components/Can";
import { AuthContext } from "../contexts/AuthContext";
import { useCan } from "../hooks/useCan";
import { setupAPIclient } from "../services/api";
import { api } from "../services/apiClient";
import { withSSRAuth } from "../utils/withSSRAuth";

export default function Dashboard() {
  useEffect(() => {
    api
      .get("/me")
      .then((response) => console.log(response))
      .catch((error) => console.log(error));
  }, []);
  const { user } = useContext(AuthContext);

  return (
    <>
      <h1>Dashboard: {user?.email} </h1>
      <Can permissions={["metrics.create"]}>
        <div>Métricas</div>
      </Can>
    </>
  );
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIclient(ctx);

  const response = await apiClient.get("/me");
  console.log(response);

  return {
    props: {},
  };
});
