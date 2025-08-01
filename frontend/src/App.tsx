import { ConnectButton } from "@mysten/dapp-kit";
import { WalletStatus } from "./components/WalletStatus";

function App() {
  return (
    <>
      <section>
        <header>
          <nav className="w-full bg-slate-800 p-4">
            <h1>dApp Starter Template</h1>
          </nav>
        </header>
        <main className="px-4">
          <WalletStatus />
          <ConnectButton />
        </main>
      </section>
    </>
  );
}

export default App;
