export interface User {
  id: number;
  email: string;
  full_name?: string;
  theme: string;
  currency: string;
  has_pin: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface StockInvestment {
  id: number;
  symbol: string;
  company_name?: string;
  sector?: string;
  units: number;
  buy_price: number;
  buy_date: string;
  broker_commission: number;
  notes?: string;
  is_closed: boolean;
  sell_price?: number;
  sell_date?: string;
  sell_commission: number;
  invested_amount: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  realized_pnl?: number;
}

export interface MutualFundInvestment {
  id: number;
  fund_name: string;
  amc_name?: string;
  fund_type?: string;
  units: number;
  purchase_nav: number;
  purchase_date: string;
  load_percentage: number;
  notes?: string;
  is_closed: boolean;
  sell_nav?: number;
  sell_date?: string;
  invested_amount: number;
  current_nav?: number;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  realized_pnl?: number;
}

export interface Goal {
  id: number;
  name: string;
  description?: string;
  target_amount: number;
  deadline?: string;
  icon: string;
  color: string;
  total_saved: number;
  progress_percent: number;
  remaining_amount: number;
  contributions: GoalContribution[];
}

export interface GoalContribution {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note?: string;
}

export interface Loan {
  id: number;
  lender_name: string;
  description?: string;
  principal_amount: number;
  interest_rate: number;
  start_date: string;
  due_date?: string;
  notes?: string;
  total_paid: number;
  remaining_balance: number;
  progress_percent: number;
  repayments: LoanRepayment[];
}

export interface LoanRepayment {
  id: number;
  loan_id: number;
  amount: number;
  date: string;
  note?: string;
}

export interface DashboardSummary {
  total_net_worth: number;
  total_invested: number;
  stocks_value: number;
  mutual_funds_value: number;
  stocks_invested: number;
  mutual_funds_invested: number;
  total_goals_saved: number;
  total_loans_remaining: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  total_pnl_percent: number;
  portfolio_history: { date: string; value: number }[];
}

export interface PeriodSummaryItem {
  period: string;
  stocks_invested: number;
  mutual_funds_invested: number;
  goals_saved: number;
  loans_repaid: number;
  total: number;
}

export interface PeriodSummaryResponse {
  monthly: PeriodSummaryItem[];
  yearly: PeriodSummaryItem[];
}

export interface ExpenseItem {
  id: number;
  income_id: number;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

export interface IncomeEntry {
  id: number;
  income_type: string;
  source_name?: string;
  amount: number;
  date: string;
  note?: string;
  total_expense: number;
  remaining: number;
  expenses: ExpenseItem[];
}

export interface ExpensePeriodSummaryItem {
  period: string;
  income_total: number;
  expense_total: number;
  net_savings: number;
}

export interface ExpenseSummaryResponse {
  monthly: ExpensePeriodSummaryItem[];
  yearly: ExpensePeriodSummaryItem[];
}

export interface CategorySlice {
  name: string;
  value: number;
}

export interface ModuleReportSummary {
  module: string;
  total: number;
  categories: CategorySlice[];
}

export interface ReportsOverviewResponse {
  range_label: string;
  modules: ModuleReportSummary[];
}

export interface StockSearchResult {
  symbol: string;
  company_name?: string;
  sector?: string;
  current_price?: number;
  change?: number;
  change_percent?: number;
}

export interface FundSearchResult {
  fund_name: string;
  amc_name?: string;
  fund_type?: string;
  current_nav?: number;
  nav_date?: string;
}
