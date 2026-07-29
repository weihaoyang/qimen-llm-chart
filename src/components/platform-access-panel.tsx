"use client";

import { ArrowRight, LoaderCircle, RefreshCw, ShoppingCart } from "lucide-react";
import type { PlanCatalogItem, PlatformProfile } from "@singularity-sequence/web-sdk";
import { Button } from "@/components/ui/button";

type PlatformAccessPanelProps = {
  enabled: boolean;
  loading: boolean;
  loggedIn: boolean;
  profile: PlatformProfile | null;
  availableUsage: number;
  errorMessage: string | null;
  plans: PlanCatalogItem[];
  selectedChannel: string;
  checkoutLoading: string | null;
  loginLoading: boolean;
  refreshLoading?: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onCheckout: (planCode: string) => void;
  onRefresh?: () => void;
};

const formatPrice = (priceCny: number) => `¥${(priceCny / 100).toFixed(2)}`;

export function PlatformAccessPanel({
  enabled,
  loading,
  loggedIn,
  profile,
  availableUsage,
  errorMessage,
  plans,
  selectedChannel,
  checkoutLoading,
  loginLoading,
  refreshLoading = false,
  onLogin,
  onLogout,
  onCheckout,
  onRefresh,
}: PlatformAccessPanelProps) {
  if (!enabled) {
    return (
      <section className="platform-panel">
        <div className="platform-panel__header">
          <div>
            <h2>单次分析</h2>
          </div>
        </div>
        <div className="platform-panel__empty">
          支付服务暂未连接。
        </div>
      </section>
    );
  }

  return (
    <section className="platform-panel">
      <div className="platform-panel__header">
        <div>
          <h2>单次分析</h2>
        </div>
        <span className={availableUsage > 0 ? "platform-badge is-allowed" : "platform-badge"}>
          {availableUsage > 0 ? `${availableUsage} 次可用` : "¥10 / 次"}
        </span>
      </div>

      {onRefresh ? (
        <div className="platform-panel__toolbar">
          <Button
            className="command-button"
            variant="ghost"
            type="button"
            onClick={onRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? <LoaderCircle className="agent-spin" /> : <RefreshCw />}
            {refreshLoading ? "同步中" : "刷新状态"}
          </Button>
        </div>
      ) : null}

      <div className="platform-panel__status">
        {loading ? (
          <div className="platform-inline-status">
            <LoaderCircle className="agent-spin" />
            正在同步平台状态
          </div>
        ) : loggedIn && profile ? (
          <>
            <div className="platform-account-card">
              <strong>{profile.display_name || profile.phone_number}</strong>
              <span>{profile.phone_number}</span>
            </div>
            <Button className="command-button" variant="outline" type="button" onClick={onLogout}>
              退出登录
            </Button>
          </>
        ) : (
          <div className="platform-login-actions">
            <Button
              className="command-button command-button-primary"
              type="button"
              disabled={loginLoading}
              onClick={onLogin}
            >
              {loginLoading ? <LoaderCircle className="agent-spin" /> : <ArrowRight data-icon="inline-start" />}
              {loginLoading ? "跳转中" : "进入公司登录页"}
            </Button>
          </div>
        )}
      </div>

      {errorMessage ? <p className="platform-panel__message">{errorMessage}</p> : null}

      <div className="platform-plan-list">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <article className="platform-plan-card" key={plan.plan_code}>
              <div className="platform-plan-card__head">
                <strong>{plan.title}</strong>
                <span>{formatPrice(plan.price_cny)}</span>
              </div>
              <p>
                {plan.billing_period === "per_use" ? "1 次 Agent 分析" : plan.billing_period}
              </p>
              <Button
                className="command-button"
                variant="default"
                type="button"
                onClick={() => (loggedIn ? onCheckout(plan.plan_code) : onLogin())}
                disabled={Boolean(checkoutLoading) || loginLoading}
              >
                {checkoutLoading === plan.plan_code ? (
                  <LoaderCircle className="agent-spin" />
                ) : (
                  <ShoppingCart data-icon="inline-start" />
                )}
                {checkoutLoading === plan.plan_code ? "跳转中" : loggedIn ? "购买 1 次" : "登录后购买"}
              </Button>
            </article>
          ))
        ) : (
          <div className="platform-panel__empty">单次分析暂不可购买。</div>
        )}
      </div>
    </section>
  );
}
