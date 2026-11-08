import { go, useRoute } from './lib/router';
import { useLoaded } from './lib/store';
import { useT } from './lib/i18n';
import GamesView from './views/GamesView';
import TeamsView from './views/TeamsView';
import TeamEditView from './views/TeamEditView';
import NewGameView from './views/NewGameView';
import LiveView from './views/LiveView';
import ResultsView from './views/ResultsView';
import SettingsView from './views/SettingsView';

export default function App() {
  const route = useRoute();
  const loaded = useLoaded();
  const t = useT();

  if (!loaded) return <div className="splash">🏒</div>;

  // Live tracking takes the whole screen, no navigation chrome.
  if (route.name === 'live' && route.id) return <LiveView gameId={route.id} />;

  const tabs: [string, string][] = [['games', t.games], ['teams', t.teams], ['settings', t.settings]];
  const activeTab = route.name === 'team' ? 'teams' : route.name === 'new' || route.name === 'results' ? 'games' : route.name;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand" onClick={() => go('games')}>🏒 {t.appName}</span>
        <nav>
          {tabs.map(([name, label]) => (
            <button key={name} className={activeTab === name ? 'active' : ''} onClick={() => go(name)}>{label}</button>
          ))}
        </nav>
      </header>
      <main className="content">
        {route.name === 'teams' && <TeamsView />}
        {route.name === 'team' && <TeamEditView teamId={route.id} />}
        {route.name === 'new' && <NewGameView />}
        {route.name === 'results' && route.id && <ResultsView gameId={route.id} />}
        {route.name === 'settings' && <SettingsView />}
        {(route.name === 'games' || !['teams', 'team', 'new', 'results', 'settings'].includes(route.name)) && <GamesView />}
      </main>
    </div>
  );
}
