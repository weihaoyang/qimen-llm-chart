"use client";

import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CHINESE_TIME, MUTAGEN } from "iztro/lib/data";
import { getPalaceNames } from "iztro/lib/astro";
import { kot, t } from "iztro/lib/i18n";
import {
  fixEarthlyBranchIndex,
  fixIndex,
  getMutagensByHeavenlyStem,
} from "iztro/lib/utils";
import { normalizeDateStr, solar2lunar } from "lunar-lite";
import { useIztro } from "iztro-hook";

function Item({ title, content }) {
  return (
    <li className="iztro-palace-center-item">
      <label>{title}</label>
      <span>{content}</span>
    </li>
  );
}

function Line({ index, scope }) {
  const lineRef = useRef(null);
  const strokeColor = useMemo(() => {
    if (!scope) {
      return "rgba(245,0,0)";
    }

    const element = document.getElementsByClassName(
      "iztro-astrolabe-theme-default",
    )[0];

    if (!element) {
      return "rgba(245,0,0)";
    }

    return getComputedStyle(element).getPropertyValue(
      `--iztro-color-${scope}`,
    );
  }, [scope]);

  useEffect(() => {
    const canvas = lineRef.current;

    if (!canvas || index < 0) {
      return;
    }

    const { height, width } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const points = [
      [0, halfHeight * 2],
      [0, halfHeight * 1.5],
      [0, halfHeight * 0.5],
      [0, 0],
      [halfWidth * 0.5, 0],
      [halfWidth * 1.5, 0],
      [halfWidth * 2, 0],
      [halfWidth * 2, halfHeight * 0.5],
      [halfWidth * 2, halfHeight * 1.5],
      [halfWidth * 2, halfHeight * 2],
      [halfWidth * 1.5, halfHeight * 2],
      [halfWidth * 0.5, halfHeight * 2],
    ];

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = strokeColor;
    context.lineWidth = 1;
    context.globalAlpha = 0.5;

    const oppositeIndex = fixIndex(index + 6);
    const forwardIndex = fixIndex(index + 4);
    const backwardIndex = fixIndex(index - 4);

    context.beginPath();
    context.moveTo(points[oppositeIndex][0], points[oppositeIndex][1]);
    context.lineTo(points[index][0], points[index][1]);
    context.lineTo(points[forwardIndex][0], points[forwardIndex][1]);
    context.lineTo(points[backwardIndex][0], points[backwardIndex][1]);
    context.lineTo(points[index][0], points[index][1]);
    context.stroke();
  }, [index, strokeColor]);

  return (
    <canvas
      id="palace-line"
      className={scope}
      ref={lineRef}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        userSelect: "none",
        pointerEvents: "none",
        top: 0,
        left: 0,
      }}
    />
  );
}

function Izstar({
  horoscopeMutagens,
  activeHeavenlyStem,
  hoverHeavenlyStem,
  palaceHeavenlyStem,
  ...star
}) {
  const mutagenStyle = useMemo(() => {
    if (!activeHeavenlyStem) {
      return "";
    }

    const mutagens = getMutagensByHeavenlyStem(t(activeHeavenlyStem));
    const index = mutagens.indexOf(star.name);

    if (index < 0) {
      return "";
    }

    return `iztro-star-mutagen-${index}`;
  }, [activeHeavenlyStem, star.name]);

  const hoverMutagenStyle = useMemo(() => {
    if (!hoverHeavenlyStem) {
      return "";
    }

    const mutagens = getMutagensByHeavenlyStem(t(hoverHeavenlyStem));
    const index = mutagens.indexOf(star.name);

    if (index < 0) {
      return "";
    }

    return `iztro-star-hover-mutagen-${index}`;
  }, [hoverHeavenlyStem, star.name]);

  const selfMutagenStyle = useMemo(() => {
    if (!palaceHeavenlyStem || activeHeavenlyStem || hoverHeavenlyStem) {
      return undefined;
    }

    const mutagens = getMutagensByHeavenlyStem(t(palaceHeavenlyStem));
    const index = mutagens.indexOf(star.name);

    if (index < 0) {
      return "";
    }

    return `iztro-star-self-mutagen-${index}`;
  }, [palaceHeavenlyStem, activeHeavenlyStem, hoverHeavenlyStem, star.name]);

  return (
    <div className={classNames("iztro-star", `iztro-star-${star.type}`)}>
      <span
        className={classNames(
          "star-with-mutagen",
          mutagenStyle,
          selfMutagenStyle,
          hoverMutagenStyle,
          {
            "iztro-star-self-mutagen": Boolean(selfMutagenStyle),
          },
        )}
      >
        {star.name}
      </span>
      <i className="iztro-star-brightness">{star.brightness}</i>
      {star.mutagen ? (
        <span
          className={classNames(
            "iztro-star-mutagen",
            `mutagen-${MUTAGEN.indexOf(kot(star.mutagen))}`,
          )}
        >
          {star.mutagen}
        </span>
      ) : null}
      {horoscopeMutagens?.map((item) => {
        if (item.mutagen.includes(star.name) && item.show) {
          return (
            <span
              key={item.scope}
              className={classNames(
                "iztro-star-mutagen",
                `mutagen-${item.scope}`,
              )}
            >
              {t(MUTAGEN[item.mutagen.indexOf(star.name)])}
            </span>
          );
        }

        return null;
      })}
    </div>
  );
}

function Izpalace({
  index,
  taichiPalace,
  focusedIndex,
  onFocused,
  horoscope,
  activeHeavenlyStem,
  toggleActiveHeavenlyStem,
  hoverHeavenlyStem,
  setHoverHeavenlyStem,
  showDecadalScope = false,
  showYearlyScope = false,
  showMonthlyScope = false,
  showDailyScope = false,
  showHourlyScope = false,
  toggleScope,
  toggleTaichiPoint,
  ...palace
}) {
  const horoscopeNames = useMemo(() => {
    const names = [];

    if (horoscope?.decadal.index === index) {
      names.push({
        ...horoscope.decadal,
        scope: "decadal",
        show: showDecadalScope,
      });
    }

    if (horoscope?.yearly.index === index) {
      names.push({
        ...horoscope.yearly,
        scope: "yearly",
        show: showYearlyScope,
      });
    }

    if (horoscope?.monthly.index === index) {
      names.push({
        ...horoscope.monthly,
        scope: "monthly",
        show: showMonthlyScope,
      });
    }

    if (horoscope?.daily.index === index) {
      names.push({
        ...horoscope.daily,
        scope: "daily",
        show: showDailyScope,
      });
    }

    if (horoscope?.hourly.index === index) {
      names.push({
        ...horoscope.hourly,
        scope: "hourly",
        show: showHourlyScope,
      });
    }

    if (horoscope?.age.index === index) {
      names.push({
        name: horoscope.age.name,
        heavenlyStem: undefined,
        scope: "age",
        show: false,
      });
    }

    return names;
  }, [
    horoscope,
    index,
    showDecadalScope,
    showYearlyScope,
    showMonthlyScope,
    showDailyScope,
    showHourlyScope,
  ]);

  const horoscopeMutagens = useMemo(() => {
    if (!horoscope) {
      return [];
    }

    return [
      {
        mutagen: horoscope.decadal.mutagen,
        scope: "decadal",
        show: showDecadalScope,
      },
      {
        mutagen: horoscope.yearly.mutagen,
        scope: "yearly",
        show: showYearlyScope,
      },
      {
        mutagen: horoscope.monthly.mutagen,
        scope: "monthly",
        show: showMonthlyScope,
      },
      {
        mutagen: horoscope.daily.mutagen,
        scope: "daily",
        show: showDailyScope,
      },
      {
        mutagen: horoscope.hourly.mutagen,
        scope: "hourly",
        show: showHourlyScope,
      },
    ];
  }, [
    horoscope,
    showDecadalScope,
    showYearlyScope,
    showMonthlyScope,
    showDailyScope,
    showHourlyScope,
  ]);

  return (
    <div
      className={classNames("iztro-palace", {
        "focused-palace": focusedIndex === index,
        "opposite-palace":
          focusedIndex != null && index === fixIndex(focusedIndex + 6),
        "surrounded-palace":
          focusedIndex != null &&
          (index === fixIndex(focusedIndex + 4) ||
            index === fixIndex(focusedIndex - 4)),
      })}
      style={{ gridArea: `g${index}` }}
      onMouseEnter={() => onFocused?.(index)}
      onMouseLeave={() => onFocused?.(undefined)}
    >
      <div className="iztro-palace-major">
        {palace.majorStars.map((star) => (
          <Izstar
            key={star.name}
            activeHeavenlyStem={activeHeavenlyStem}
            hoverHeavenlyStem={hoverHeavenlyStem}
            palaceHeavenlyStem={kot(palace.heavenlyStem, "Heavenly")}
            horoscopeMutagens={horoscopeMutagens}
            {...star}
          />
        ))}
      </div>

      <div className="iztro-palace-minor">
        {palace.minorStars.map((star) => (
          <Izstar
            key={star.name}
            activeHeavenlyStem={activeHeavenlyStem}
            hoverHeavenlyStem={hoverHeavenlyStem}
            palaceHeavenlyStem={kot(palace.heavenlyStem, "Heavenly")}
            horoscopeMutagens={horoscopeMutagens}
            {...star}
          />
        ))}
      </div>

      <div className="iztro-palace-adj">
        <div>
          {palace.adjectiveStars.slice(5).map((star) => (
            <Izstar key={star.name} {...star} />
          ))}
        </div>
        <div>
          {palace.adjectiveStars.slice(0, 5).map((star) => (
            <Izstar key={star.name} {...star} />
          ))}
        </div>
      </div>

      <div className="iztro-palace-horo-star">
        <div className="stars">
          {horoscope?.decadal?.stars &&
            horoscope.decadal.stars[index].map((star) => (
              <Izstar key={star.name} {...star} />
            ))}
        </div>
        <div className="stars">
          {horoscope?.yearly?.stars &&
            horoscope.yearly.stars[index].map((star) => (
              <Izstar key={star.name} {...star} />
            ))}
        </div>
      </div>

      <div className="iztro-palace-fate">
        {horoscopeNames?.map((item) => (
          <span
            key={item.name}
            className={classNames({
              [`iztro-palace-${item.scope}-active`]: item.show,
            })}
            onClick={item.scope ? () => toggleScope?.(item.scope) : undefined}
          >
            {item.name}
            {item.heavenlyStem ? `·${item.heavenlyStem}` : null}
          </span>
        ))}
      </div>

      <div className="iztro-palace-footer">
        <div>
          <div className="iztro-palace-lft24">
            <div>{palace.changsheng12}</div>
            <div>{palace.boshi12}</div>
          </div>
          <div
            className="iztro-palace-name"
            onClick={() => toggleTaichiPoint?.(index)}
          >
            <span className="iztro-palace-name-wrapper">
              {palace.name}
              <span className="iztro-palace-name-taichi">
                {taichiPalace
                  ? kot(taichiPalace) === kot("命宫")
                    ? "☯"
                    : taichiPalace
                  : null}
              </span>
            </span>
            {palace.isBodyPalace ? (
              <span className="iztro-palace-name-body">·{t("bodyPalace")}</span>
            ) : null}
          </div>
        </div>

        <div>
          <div className="iztro-palace-scope">
            <div className="iztro-palace-scope-age">
              {palace.ages.slice(0, 7).join(" ")}
            </div>
            <div className="iztro-palace-scope-decadal">
              {palace.decadal.range.join(" - ")}
            </div>
          </div>
          <div className="iztro-palace-dynamic-name">
            {showDecadalScope ? (
              <span className="iztro-palace-dynamic-name-decadal">
                {horoscope?.decadal.palaceNames[index]}
              </span>
            ) : null}
            {showYearlyScope ? (
              <span className="iztro-palace-dynamic-name-yearly">
                {horoscope?.yearly.palaceNames[index]}
              </span>
            ) : null}
            {showMonthlyScope ? (
              <span className="iztro-palace-dynamic-name-monthly">
                {horoscope?.monthly.palaceNames[index]}
              </span>
            ) : null}
            {showDailyScope ? (
              <span className="iztro-palace-dynamic-name-daily">
                {horoscope?.daily.palaceNames[index]}
              </span>
            ) : null}
            {showHourlyScope ? (
              <span className="iztro-palace-dynamic-name-hourly">
                {horoscope?.hourly.palaceNames[index]}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <div className="iztro-palace-rgt24">
            <div>
              {showYearlyScope
                ? horoscope?.yearly.yearlyDecStar.suiqian12[index]
                : palace.suiqian12}
            </div>
            <div>
              {showYearlyScope
                ? horoscope?.yearly.yearlyDecStar.jiangqian12[index]
                : palace.jiangqian12}
            </div>
          </div>
          <div
            className={classNames("iztro-palace-gz", {
              "iztro-palace-gz-active":
                activeHeavenlyStem === kot(palace.heavenlyStem, "Heavenly"),
            })}
            onClick={() =>
              toggleActiveHeavenlyStem?.(kot(palace.heavenlyStem, "Heavenly"))
            }
            onMouseEnter={() =>
              setHoverHeavenlyStem?.(kot(palace.heavenlyStem, "Heavenly"))
            }
            onMouseLeave={() => setHoverHeavenlyStem?.(undefined)}
          >
            <span
              className={classNames({
                "iztro-palace-gz-active":
                  activeHeavenlyStem === kot(palace.heavenlyStem, "Heavenly"),
              })}
            >
              {palace.heavenlyStem}
              {palace.earthlyBranch}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IzpalaceCenter({
  astrolabe,
  horoscope,
  arrowIndex,
  arrowScope,
  horoscopeDate = new Date(),
  horoscopeHour = 0,
  setHoroscopeDate,
  setHoroscopeHour,
  centerPalaceAlign,
}) {
  const records = useMemo(
    () => [
      { title: "五行局：", content: astrolabe?.fiveElementsClass },
      { title: "年龄(虚岁)：", content: `${horoscope?.age.nominalAge} 岁` },
      { title: "四柱：", content: astrolabe?.chineseDate },
      { title: "阳历：", content: astrolabe?.solarDate },
      { title: "农历：", content: astrolabe?.lunarDate },
      { title: "时辰：", content: `${astrolabe?.time}(${astrolabe?.timeRange})` },
      { title: "生肖：", content: astrolabe?.zodiac },
      { title: "星座：", content: astrolabe?.sign },
      { title: "命主：", content: astrolabe?.soul },
      { title: "身主：", content: astrolabe?.body },
      { title: "命宫：", content: astrolabe?.earthlyBranchOfSoulPalace },
      { title: "身宫：", content: astrolabe?.earthlyBranchOfBodyPalace },
    ],
    [astrolabe, horoscope],
  );

  const horoDate = useMemo(() => {
    const [year, month, day] = normalizeDateStr(horoscopeDate ?? new Date());

    return {
      solar: `${year}-${month}-${day}`,
      lunar: solar2lunar(horoscopeDate ?? new Date()).toString(true),
    };
  }, [horoscopeDate]);

  const onHoroscopeButtonClicked = (scope, value) => {
    if (!astrolabe?.solarDate) {
      return;
    }

    const [year, month, day] = normalizeDateStr(horoscopeDate);
    const date = new Date(year, month - 1, day);
    const [birthYear, birthMonth, birthDay] = normalizeDateStr(
      astrolabe.solarDate,
    );
    const birthday = new Date(birthYear, birthMonth - 1, birthDay);
    let nextHour = horoscopeHour;

    switch (scope) {
      case "hourly":
        nextHour = horoscopeHour + value;

        if (horoscopeHour + value > 11) {
          date.setDate(date.getDate() + 1);
          nextHour = 0;
        } else if (horoscopeHour + value < 0) {
          date.setDate(date.getDate() - 1);
          nextHour = 11;
        }
        break;
      case "daily":
        date.setDate(date.getDate() + value);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + value);
        break;
      case "yearly":
      case "decadal":
        date.setFullYear(date.getFullYear() + value);
        break;
      default:
        break;
    }

    if (date.getTime() >= birthday.getTime()) {
      setHoroscopeDate?.(date);
      setHoroscopeHour?.(nextHour);
    }
  };

  const shouldBeDisabled = useCallback(
    (dateString, scope, value) => {
      if (!astrolabe?.solarDate) {
        return true;
      }

      const [year, month, day] = normalizeDateStr(dateString);
      const date = new Date(year, month - 1, day);
      const [birthYear, birthMonth, birthDay] = normalizeDateStr(
        astrolabe.solarDate,
      );
      const birthday = new Date(birthYear, birthMonth - 1, birthDay);

      switch (scope) {
        case "hourly":
          if (horoscopeHour + value > 11) {
            date.setDate(date.getDate() + 1);
          } else if (horoscopeHour + value < 0) {
            date.setDate(date.getDate() - 1);
          }
          break;
        case "daily":
          date.setDate(date.getDate() + value);
          break;
        case "monthly":
          date.setMonth(date.getMonth() + value);
          break;
        case "yearly":
        case "decadal":
          date.setFullYear(date.getFullYear() + value);
          break;
        default:
          break;
      }

      return date.getTime() < birthday.getTime();
    },
    [astrolabe, horoscopeHour],
  );

  return (
    <div
      className={classNames("iztro-center-palace", {
        "iztro-center-palace-centralize": centerPalaceAlign,
      })}
    >
      {astrolabe?.earthlyBranchOfSoulPalace ? (
        <Line
          scope={arrowScope}
          index={
            arrowIndex ?? fixEarthlyBranchIndex(astrolabe.earthlyBranchOfSoulPalace)
          }
        />
      ) : null}

      <h3 className="center-title">
        <span className={`gender gender-${kot(astrolabe?.gender ?? "")}`}>
          {kot(astrolabe?.gender ?? "") === "male" ? "♂" : "♀"}
        </span>
        <span>基本信息</span>
      </h3>

      <ul className="basic-info">
        {records.map((record, index) => (
          <Item key={index} {...record} />
        ))}
      </ul>

      <h3 className="center-title">运限信息</h3>

      <ul className="basic-info">
        <Item title="农历：" content={horoDate.lunar} />
        <div
          className={classNames("solar-horoscope", {
            "solar-horoscope-centralize": centerPalaceAlign,
          })}
        >
          <Item title="阳历：" content={horoDate.solar} />
          <span
            className="today"
            onClick={() => {
              const now = new Date();
              setHoroscopeDate?.(now);
              setHoroscopeHour?.(Math.floor((now.getHours() + 1) / 2) % 12);
            }}
          >
            今
          </span>
        </div>
      </ul>

      <div className="horo-buttons">
        <span
          className={classNames("center-button", {
            disabled: shouldBeDisabled(horoDate.solar, "yearly", -10),
          })}
          onClick={() => onHoroscopeButtonClicked("yearly", -10)}
        >
          ◀限
        </span>
        <span
          className={classNames("center-button", {
            disabled: shouldBeDisabled(horoDate.solar, "yearly", -1),
          })}
          onClick={() => onHoroscopeButtonClicked("yearly", -1)}
        >
          ◀年
        </span>
        <span
          className={classNames("center-button", {
            disabled: shouldBeDisabled(horoDate.solar, "monthly", -1),
          })}
          onClick={() => onHoroscopeButtonClicked("monthly", -1)}
        >
          ◀月
        </span>
        <span
          className={classNames("center-button", {
            disabled: shouldBeDisabled(horoDate.solar, "daily", -1),
          })}
          onClick={() => onHoroscopeButtonClicked("daily", -1)}
        >
          ◀日
        </span>
        <span
          className={classNames("center-button", {
            disabled: shouldBeDisabled(horoDate.solar, "hourly", -1),
          })}
          onClick={() => onHoroscopeButtonClicked("hourly", -1)}
        >
          ◀时
        </span>
        <span className="center-horo-hour">{t(CHINESE_TIME[horoscopeHour])}</span>
        <span
          className="center-button"
          onClick={() => onHoroscopeButtonClicked("hourly", 1)}
        >
          时▶
        </span>
        <span
          className="center-button"
          onClick={() => onHoroscopeButtonClicked("daily", 1)}
        >
          日▶
        </span>
        <span
          className="center-button"
          onClick={() => onHoroscopeButtonClicked("monthly", 1)}
        >
          月▶
        </span>
        <span
          className="center-button"
          onClick={() => onHoroscopeButtonClicked("yearly", 1)}
        >
          年▶
        </span>
        <span
          className="center-button"
          onClick={() => onHoroscopeButtonClicked("yearly", 10)}
        >
          限▶
        </span>
      </div>

      <a
        className="iztro-copyright"
        href="https://github.com/sylarlong/iztro"
        target="_blank"
        rel="noreferrer"
      >
        <i>
          Powered by <code>iztro</code>
        </i>
      </a>
    </div>
  );
}

export function Iztrolabe(props) {
  const [taichiPoint, setTaichiPoint] = useState(-1);
  const [activeHeavenlyStem, setActiveHeavenlyStem] = useState();
  const [hoverHeavenlyStem, setHoverHeavenlyStem] = useState();
  const [focusedIndex, setFocusedIndex] = useState();
  const [showDecadal, setShowDecadal] = useState(false);
  const [showYearly, setShowYearly] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  const [horoscopeDate, setHoroscopeDate] = useState(
    () => props.horoscopeDate ?? new Date(),
  );
  const [horoscopeHour, setHoroscopeHour] = useState(
    () => props.horoscopeHour ?? 0,
  );
  const { astrolabe, horoscope, setHoroscope } = useIztro({
    birthday: props.birthday,
    birthTime: props.birthTime,
    gender: props.gender,
    birthdayType: props.birthdayType,
    fixLeap: props.fixLeap,
    isLeapMonth: props.isLeapMonth,
    lang: props.lang,
    astroType: props.astroType,
    options: props.options,
  });

  const toggleShowScope = (scope) => {
    switch (scope) {
      case "decadal":
        setShowDecadal((value) => !value);
        break;
      case "yearly":
        setShowYearly((value) => !value);
        break;
      case "monthly":
        setShowMonthly((value) => !value);
        break;
      case "daily":
        setShowDaily((value) => !value);
        break;
      case "hourly":
        setShowHourly((value) => !value);
        break;
      default:
        break;
    }
  };

  const toggleActiveHeavenlyStem = (heavenlyStem) => {
    setActiveHeavenlyStem((value) =>
      value === heavenlyStem ? undefined : heavenlyStem,
    );
  };

  const dynamic = useMemo(() => {
    if (showHourly) {
      return {
        arrowIndex: horoscope?.hourly.index,
        arrowScope: "hourly",
      };
    }

    if (showDaily) {
      return {
        arrowIndex: horoscope?.daily.index,
        arrowScope: "daily",
      };
    }

    if (showMonthly) {
      return {
        arrowIndex: horoscope?.monthly.index,
        arrowScope: "monthly",
      };
    }

    if (showYearly) {
      return {
        arrowIndex: horoscope?.yearly.index,
        arrowScope: "yearly",
      };
    }

    if (showDecadal) {
      return {
        arrowIndex: horoscope?.decadal.index,
        arrowScope: "decadal",
      };
    }

    return undefined;
  }, [showDecadal, showYearly, showMonthly, showDaily, showHourly, horoscope]);

  useEffect(() => {
    setHoroscope(horoscopeDate ?? new Date(), horoscopeHour);
  }, [horoscopeDate, horoscopeHour, setHoroscope]);

  const taichiPalaces = useMemo(
    () => (taichiPoint < 0 ? undefined : getPalaceNames(taichiPoint)),
    [taichiPoint],
  );

  const toggleTaichiPoint = (index) => {
    setTaichiPoint((value) => (value === index ? -1 : index));
  };

  return (
    <div className={classNames("iztro-astrolabe", "iztro-astrolabe-theme-default")}>
      {astrolabe?.palaces.map((palace) => (
        <Izpalace
          key={palace.earthlyBranch}
          focusedIndex={focusedIndex}
          onFocused={setFocusedIndex}
          horoscope={horoscope}
          showDecadalScope={showDecadal}
          showYearlyScope={showYearly}
          showMonthlyScope={showMonthly}
          showDailyScope={showDaily}
          showHourlyScope={showHourly}
          taichiPalace={taichiPalaces?.[palace.index]}
          toggleScope={toggleShowScope}
          activeHeavenlyStem={activeHeavenlyStem}
          toggleActiveHeavenlyStem={toggleActiveHeavenlyStem}
          hoverHeavenlyStem={hoverHeavenlyStem}
          setHoverHeavenlyStem={setHoverHeavenlyStem}
          toggleTaichiPoint={toggleTaichiPoint}
          {...palace}
        />
      ))}
      <IzpalaceCenter
        astrolabe={astrolabe}
        horoscope={horoscope}
        horoscopeDate={horoscopeDate}
        horoscopeHour={horoscopeHour}
        setHoroscopeDate={setHoroscopeDate}
        setHoroscopeHour={setHoroscopeHour}
        centerPalaceAlign={props.centerPalaceAlign}
        {...dynamic}
      />
    </div>
  );
}
