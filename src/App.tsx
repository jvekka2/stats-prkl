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
import ShotTableView from './views/ShotTableView';
import AboutView from './views/AboutView';

export default function App() {
  const route = useRoute();
  const loaded = useLoaded();
  const t = useT();

  if (!loaded) return <div className="splash">🏒</div>;

  // Live tracking takes the whole screen, no navigation chrome.
  if (route.name === 'live' && route.id) return <LiveView gameId={route.id} />;

  const tabs: [string, string, string][] = [['games', t.games, '\u{1F3D2}'], ['teams', t.teams, '\u{1F455}'], ['settings', t.settings, '\u2699\uFE0F'], ['about', t.about, '\u2139\uFE0F']];
  const activeTab = route.name === 'team' ? 'teams' : route.name === 'new' || route.name === 'results' || route.name === 'edit' ? 'games' : route.name;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand" onClick={() => go('games')}>🏒 Stats <b>PRKL</b></span>
        <nav>
          {tabs.map(([name, label, icon]) => (
            <button key={name} className={activeTab === name ? 'active' : ''} onClick={() => go(name)} aria-label={label} title={label}>
              <span className="nav-icon">{icon}</span><span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="content">
        {route.name === 'teams' && <TeamsView />}
        {route.name === 'team' && <TeamEditView teamId={route.id} />}
        {route.name === 'new' && <NewGameView />}
        {route.name === 'results' && route.id && <ResultsView gameId={route.id} />}
        {route.name === 'edit' && route.id && <ShotTableView gameId={route.id} />}
        {route.name === 'settings' && <SettingsView />}
        {route.name === 'about' && <AboutView />}
        {(route.name === 'games' || !['teams', 'team', 'new', 'results', 'edit', 'settings', 'about'].includes(route.name)) && <GamesView />}
      </main>
    </div>
  );
}
