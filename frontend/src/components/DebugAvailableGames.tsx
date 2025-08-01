import { useAvailableGames } from "@/hooks/useGameContract";

export default function DebugAvailableGames() {
  const { data, isLoading, error } = useAvailableGames();

  return (
    <div>
      <h3>Debug Info:</h3>
      <p>Loading: {isLoading ? "Yes" : "No"}</p>
      <p>Error: {error ? error.message : "None"}</p>
      <p>Data: {JSON.stringify(data)}</p>
    </div>
  );
}
