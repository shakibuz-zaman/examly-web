import { NavLink } from "react-router-dom";
import { STUDENT_NAV } from "./nav";

export function BottomTabBar() {
  return (
    <nav className="ex-tabbar" aria-label="প্রধান নেভিগেশন">
      {STUDENT_NAV.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className="ex-tabbar-link">
          <span className="ex-tabbar-iconwrap">
            <Icon size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="ex-tabbar-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
