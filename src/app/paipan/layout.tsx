import "react-iztro/lib/theme/default.css";
import "react-iztro/lib/Iztrolabe/Iztrolabe.css";
import "react-iztro/lib/Izpalace/Izpalace.css";
import "react-iztro/lib/IzpalaceCenter/IzpalaceCenter.css";
import "@douyinfe/semi-ui/lib/es/_base/base.css";

// Shared shell first; each chart owns its theme and responsive rules.
import "./paipan.css";
import "./workbench-shell.css";
import "./analysis-panels.css";
import "./workbench-responsive.css";
import "./bazi.css";
import "./research.css";
import "./classic.css";
import "./ziwei.css";
import "./qimen-workbench.css";
import "./divination.css";

export default function PaipanLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
