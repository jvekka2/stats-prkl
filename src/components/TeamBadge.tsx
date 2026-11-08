/** Team logo, or a colored round badge with the abbreviation when there is no logo. */
export default function TeamBadge({ team, size = 32 }: { team: { logo?: string; color: string; shortName: string; name: string }; size?: number }) {
  if (team.logo) {
    return <img className="team-badge" src={team.logo} alt={team.name} width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="team-badge placeholder" style={{ width: size, height: size, background: team.color, fontSize: size * 0.36 }} aria-label={team.name}>
      {team.shortName.slice(0, 3)}
    </span>
  );
}
