'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  User, 
  FileText, 
  CheckCircle2, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Download, 
  Calculator,
  Sparkles,
  Settings2,
  X,
  Sliders,
  AlertCircle,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  RefreshCw
} from 'lucide-react';

export interface RoleDeductionRule {
  role: 'Employee' | 'Intern' | 'Admin';
  type: 'percentage' | 'fixed';
  fixedAmount: number; // Used if type === 'fixed'
}

export interface EmployeePayroll {
  id: string;
  name: string;
  email: string;
  role: 'Employee' | 'Intern' | 'Admin';
  baseSalary?: number | null;
  presentDays: number;
  unpaidLeaves: number; // LOP (Loss of Pay Days)
  allowances: number; // Manual Bonus / Allowance (+)
  customDeductions: number; // Manual Custom Deduction (-)
  status: 'Pending' | 'Processed';
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Global Payroll Rules State
  const [rules, setRules] = useState<RoleDeductionRule[]>([
    { role: 'Employee', type: 'percentage', fixedAmount: 0 },
    { role: 'Intern', type: 'fixed', fixedAmount: 500 },
    { role: 'Admin', type: 'percentage', fixedAmount: 0 },
  ]);

  // UI Modals & Quick Action States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [reviewingEmployee, setReviewingEmployee] = useState<EmployeePayroll | null>(null);
  const [settingSalaryEmp, setSettingSalaryEmp] = useState<EmployeePayroll | null>(null);
  const [inputSalaryValue, setInputSalaryValue] = useState<string>('');
  const [savingSalary, setSavingSalary] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Dynamic Days in Current Month (e.g. 28, 29, 30, 31)
  const daysInCurrentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }, []);

  // Fetch real employee payroll records from database API
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payroll');
      const data = await res.json();

      if (res.ok && data.records) {
        setEmployees(data.records);
      } else {
        console.error('Failed to fetch payroll data:', data.error);
      }
    } catch (err) {
      console.error('Error fetching payroll records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  // Safe Check: Is Base Salary missing, zero, null, or undefined?
  const isSalaryMissing = (emp: EmployeePayroll): boolean => {
    return emp.baseSalary === null || emp.baseSalary === undefined || emp.baseSalary <= 0 || isNaN(emp.baseSalary);
  };

  // Safe LOP Deduction Calculation
  const calculateLopDeduction = (emp: EmployeePayroll): number => {
    if (isSalaryMissing(emp) || emp.unpaidLeaves <= 0) return 0;
    const base = emp.baseSalary!;
    const rule = rules.find((r) => r.role === emp.role) || { type: 'percentage', fixedAmount: 500 };

    if (rule.type === 'fixed') {
      return emp.unpaidLeaves * (rule.fixedAmount || 0);
    } else {
      // Percentage of Base (Exact per-day salary for current month)
      const perDaySalary = base / daysInCurrentMonth;
      return Math.round(perDaySalary * emp.unpaidLeaves);
    }
  };

  // Safe Net Payable Formula: Base Salary - LOP Deduction + Allowances - Custom Deductions
  // Returns number or null if Base Salary is missing
  const calculateNetPayable = (emp: EmployeePayroll): number | null => {
    if (isSalaryMissing(emp)) {
      return null;
    }
    const base = emp.baseSalary!;
    const lop = calculateLopDeduction(emp);
    const net = base - lop + (emp.allowances || 0) - (emp.customDeductions || 0);
    return Math.max(0, Math.round(net));
  };

  // Total Estimated Payout for all employees with set salaries
  const totalEstimatedPayout = useMemo(() => {
    return employees.reduce((sum, emp) => {
      const net = calculateNetPayable(emp);
      return sum + (net !== null ? net : 0);
    }, 0);
  }, [employees, rules, daysInCurrentMonth]);

  const processedCount = useMemo(() => {
    return employees.filter((e) => e.status === 'Processed').length;
  }, [employees]);

  const missingSalaryCount = useMemo(() => {
    return employees.filter(isSalaryMissing).length;
  }, [employees]);

  // Handlers for Editable Table Inputs
  const handleFieldChange = (id: string, field: keyof EmployeePayroll, value: number) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, [field]: Math.max(0, value) } : emp))
    );

    if (reviewingEmployee && reviewingEmployee.id === id) {
      setReviewingEmployee((prev) => (prev ? { ...prev, [field]: Math.max(0, value) } : null));
    }
  };

  // Open "Set Salary Now" Quick Action Modal
  const handleOpenSetSalary = (emp: EmployeePayroll) => {
    setSettingSalaryEmp(emp);
    setInputSalaryValue(emp.role === 'Intern' ? '25000' : '65000');
  };

  // Save Base Salary to Database via API
  const handleSaveSalaryToDB = async () => {
    if (!settingSalaryEmp) return;
    const salaryNum = parseFloat(inputSalaryValue);

    if (isNaN(salaryNum) || salaryNum <= 0) {
      alert('Please enter a valid base salary amount.');
      return;
    }

    try {
      setSavingSalary(true);
      const res = await fetch(`/api/payroll/${settingSalaryEmp.id}/salary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseSalary: salaryNum })
      });

      const data = await res.json();

      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === settingSalaryEmp.id ? { ...e, baseSalary: salaryNum } : e))
        );
        setNotification(`Base salary of ₹${salaryNum.toLocaleString('en-IN')} updated for ${settingSalaryEmp.name}`);
        setSettingSalaryEmp(null);
        setTimeout(() => setNotification(null), 4000);
      } else {
        alert(data.error || 'Failed to update base salary');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to save salary.');
    } finally {
      setSavingSalary(false);
    }
  };

  // Process Payslip Action
  const handleApprovePayslip = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, status: 'Processed' } : e))
    );

    const net = calculateNetPayable(emp);
    setNotification(
      `Payslip approved for ${emp.name} (Net Payout: ₹${net !== null ? net.toLocaleString('en-IN') : 0})`
    );
    setReviewingEmployee(null);

    setTimeout(() => setNotification(null), 5000);
  };

  // Flag to temporarily disable Payroll UI and display Coming Soon
  const isComingSoon = true;

  if (isComingSoon) {
    return (
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-odizo-red/10 border border-odizo-red/20 text-odizo-red">
                <CreditCard size={24} />
              </div>
              Enterprise Payroll Engine
            </h1>
            <p className="text-sm text-odizo-grey mt-1">
              Automated salary disbursements, LOP deductions, and tax compliance for <strong className="text-slate-800 dark:text-slate-200">ODIZO</strong> workspaces.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles size={13} className="animate-spin text-amber-400" />
              Under Development
            </span>
          </div>
        </div>

        {/* Coming Soon Hero Showcase */}
        <div className="glass-card rounded-3xl p-8 sm:p-12 border-black/5 dark:border-white/5 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-odizo-red/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex p-4 rounded-3xl bg-odizo-red/10 border border-odizo-red/20 text-odizo-red shadow-[0_0_30px_rgba(225,97,103,0.2)]">
              <CreditCard size={48} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-odizo-red/15 text-odizo-red border border-odizo-red/30">
                🚀 Coming Soon
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Automated Payroll & Salary Processing
              </h2>
              <p className="text-sm text-odizo-grey leading-relaxed">
                The <strong className="text-slate-900 dark:text-white">ODIZO</strong> automated payroll engine is currently undergoing final quality checks and audit integrations. It will be enabled in an upcoming release.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-6">
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Calculator size={16} className="text-blue-400" />
                  <span>Automated LOP Deductions</span>
                </div>
                <p className="text-xs text-odizo-grey">
                  Auto-calculates unpaid loss-of-pay days grounded in biometric check-in data and approved leave requests.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Sliders size={16} className="text-purple-400" />
                  <span>Custom Role Rules</span>
                </div>
                <p className="text-xs text-odizo-grey">
                  Configure percentage vs fixed deductions and bonuses separately for Employees and Interns.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <FileText size={16} className="text-emerald-400" />
                  <span>1-Click PDF Payslips</span>
                </div>
                <p className="text-xs text-odizo-grey">
                  Generate and distribute official monthly salary slips directly to employee mobile apps and web portals.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Download size={16} className="text-amber-400" />
                  <span>Bank Batch Exports</span>
                </div>
                <p className="text-xs text-odizo-grey">
                  Export ready-to-upload NEFT/IMPS payout CSVs formatted for corporate banking portals.
                </p>
              </div>
            </div>

            <div className="pt-4 text-xs text-odizo-grey">
              All payroll settings and employee records are securely saved.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-odizo-red/10 border border-odizo-red/20 text-odizo-red">
              <CreditCard size={24} />
            </div>
            Enterprise Payroll Engine
          </h1>
          <p className="text-sm text-odizo-grey mt-1">
            Real-time database records, role-based deduction rules, and base salary overrides for <strong className="text-slate-800 dark:text-slate-200">ODIZO</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayrollData}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium text-white transition-all cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium text-white transition-all duration-300 cursor-pointer"
          >
            <Settings2 size={16} className="text-odizo-red" />
            Payroll Rules Settings
          </button>
          <button
            onClick={() => {
              setNotification('Exporting complete monthly payroll breakdown report...');
              setTimeout(() => setNotification(null), 3500);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e16167] to-[#e10b14] text-white text-sm font-bold shadow-lg shadow-odizo-red/20 hover:opacity-95 hover:shadow-[0_0_20px_rgba(225,97,103,0.3)] transition-all duration-300 cursor-pointer"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center justify-between bg-odizo-red/10 border border-odizo-red/30 rounded-2xl p-4 text-sm text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-odizo-red text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold">{notification}</span>
          </div>
          <span className="text-xs text-odizo-grey">ODIZO Payroll Engine</span>
        </div>
      )}

      {/* Quick Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-black/5 dark:border-white/5 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-sky-500/10 rounded-full blur-xl pointer-events-none opacity-50 group-hover:opacity-75 transition-opacity" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-odizo-grey">Total Staff Records</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {employees.length}
            </div>
            <span className="text-[11px] text-sky-400 font-medium inline-flex items-center gap-1 mt-1">
              <Users size={12} /> Live DB Connection
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
            <Users size={22} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-black/5 dark:border-white/5 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none opacity-50 group-hover:opacity-75 transition-opacity" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-odizo-grey">Total Estimated Payout</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              ₹{totalEstimatedPayout.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-500 font-medium inline-flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> {currentMonthName} ({daysInCurrentMonth} Days)
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Wallet size={22} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-black/5 dark:border-white/5 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-odizo-red/10 rounded-full blur-xl pointer-events-none opacity-50 group-hover:opacity-75 transition-opacity" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-odizo-grey">Payroll Status</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {processedCount} / {employees.length}
            </div>
            <span className="text-[11px] text-amber-400 font-medium inline-flex items-center gap-1 mt-1">
              <AlertCircle size={12} /> {missingSalaryCount} Salary Not Set
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-odizo-red/10 text-odizo-red border border-odizo-red/20 group-hover:scale-110 transition-transform">
            <Calculator size={22} />
          </div>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-odizo-red" />
              Payroll Operations Grid
            </h2>
            <p className="text-xs text-odizo-grey mt-0.5">
              Database integrated payroll calculation. Rows with unassigned base salaries present a prominent <strong className="text-amber-400">Salary Not Set</strong> warning state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-odizo-red/10 border border-odizo-red/20 text-odizo-red font-semibold">
              {currentMonthName} ({daysInCurrentMonth} Days)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent" />
            <p className="mt-4 text-sm text-odizo-grey font-medium">Fetching database payroll records...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
            <User size={40} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-white">No active staff records found in database.</p>
            <p className="text-xs text-odizo-grey mt-1">Add staff users in User Management to manage payroll.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-odizo-grey text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 font-semibold">Employee</th>
                  <th className="py-3 px-3 font-semibold">Base Salary (₹)</th>
                  <th className="py-3 px-3 font-semibold">LOP (Days)</th>
                  <th className="py-3 px-3 font-semibold">LOP Deduction (₹)</th>
                  <th className="py-3 px-3 font-semibold">Allowances (+)</th>
                  <th className="py-3 px-3 font-semibold">Deductions (-)</th>
                  <th className="py-3 px-3 font-semibold">Net Payable (₹)</th>
                  <th className="py-3 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((emp) => {
                  const hasMissingSalary = isSalaryMissing(emp);
                  const lopDeduction = calculateLopDeduction(emp);
                  const netPayable = calculateNetPayable(emp);
                  const rule = rules.find((r) => r.role === emp.role);

                  return (
                    <tr
                      key={emp.id}
                      className={`transition-all duration-300 group ${
                        hasMissingSalary ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Employee Name & Role */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-odizo-red/10 border border-odizo-red/20 flex items-center justify-center text-odizo-red font-bold text-xs shrink-0">
                            <User size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-odizo-red transition-colors flex items-center gap-2">
                              {emp.name}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  emp.role === 'Employee'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    : emp.role === 'Intern'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-odizo-red/10 text-odizo-red border-odizo-red/20'
                                }`}
                              >
                                {emp.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Base Salary (Editable or Missing Warning Badge) */}
                      <td className="py-3.5 px-3">
                        {hasMissingSalary ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertCircle size={13} className="shrink-0" />
                            Salary Not Set
                          </span>
                        ) : (
                          <div className="relative max-w-[130px]">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={emp.baseSalary!}
                              onChange={(e) => handleFieldChange(emp.id, 'baseSalary', parseFloat(e.target.value) || 0)}
                              className="w-full bg-[#050505] border border-white/15 rounded-xl pl-6 pr-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-odizo-red transition-colors"
                            />
                          </div>
                        )}
                      </td>

                      {/* LOP Days */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-semibold px-2.5 py-1 rounded-lg text-xs border ${
                            emp.unpaidLeaves > 0
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {emp.unpaidLeaves} Days
                        </span>
                      </td>

                      {/* Calculated LOP Deduction */}
                      <td className="py-3.5 px-3">
                        {hasMissingSalary ? (
                          <span className="text-zinc-500 text-xs font-mono">₹0</span>
                        ) : (
                          <>
                            <div className="font-semibold text-rose-400 text-xs">
                              -₹{lopDeduction.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {rule?.type === 'fixed'
                                ? `Fixed ₹${rule.fixedAmount}/day`
                                : `${((1 / daysInCurrentMonth) * 100).toFixed(1)}%/day`}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Allowances / Bonus (+) */}
                      <td className="py-3.5 px-3">
                        <div className="relative max-w-[110px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-bold">
                            +₹
                          </span>
                          <input
                            type="number"
                            disabled={hasMissingSalary}
                            value={emp.allowances}
                            onChange={(e) => handleFieldChange(emp.id, 'allowances', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#050505] border border-emerald-500/30 rounded-xl pl-7 pr-2 py-1.5 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-40"
                          />
                        </div>
                      </td>

                      {/* Custom Deductions (-) */}
                      <td className="py-3.5 px-3">
                        <div className="relative max-w-[110px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                            -₹
                          </span>
                          <input
                            type="number"
                            disabled={hasMissingSalary}
                            value={emp.customDeductions}
                            onChange={(e) => handleFieldChange(emp.id, 'customDeductions', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#050505] border border-rose-500/30 rounded-xl pl-7 pr-2 py-1.5 text-xs text-rose-400 font-semibold focus:outline-none focus:border-rose-500 transition-colors disabled:opacity-40"
                          />
                        </div>
                      </td>

                      {/* Net Payable Column */}
                      <td className="py-3.5 px-3">
                        {netPayable === null ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 font-mono text-xs font-bold">
                            N/A
                          </span>
                        ) : (
                          <div className="text-sm font-extrabold text-emerald-400">
                            ₹{netPayable.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Action Column: Set Salary Now vs Review & Process */}
                      <td className="py-3.5 px-3 text-right">
                        {hasMissingSalary ? (
                          <button
                            onClick={() => handleOpenSetSalary(emp)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 hover:opacity-95 transition-all duration-300 cursor-pointer"
                          >
                            <Wallet size={13} />
                            Set Salary Now
                          </button>
                        ) : emp.status === 'Processed' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            Processed
                          </span>
                        ) : (
                          <button
                            onClick={() => setReviewingEmployee(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#e16167] to-[#e10b14] text-white text-xs font-bold shadow-md hover:shadow-[0_0_15px_rgba(225,97,103,0.4)] hover:opacity-95 transition-all duration-300 cursor-pointer"
                          >
                            <Sliders size={13} />
                            Review & Process
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Action Modal: Set Base Salary */}
      {settingSalaryEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative text-white space-y-4 animate-float">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-400" />
                Assign Base Salary
              </h3>
              <button
                onClick={() => setSettingSalaryEmp(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                <User size={18} />
              </div>
              <div>
                <div className="font-bold text-white text-sm">{settingSalaryEmp.name}</div>
                <div className="text-xs text-zinc-400">{settingSalaryEmp.email} • Role: {settingSalaryEmp.role}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Monthly Base Salary (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  value={inputSalaryValue}
                  onChange={(e) => setInputSalaryValue(e.target.value)}
                  placeholder="e.g. 65000"
                  className="w-full bg-black border border-amber-500/40 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Suggested defaults: Employees (₹65,000), Interns (₹25,000), Admins (₹90,000).
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSettingSalaryEmp(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSalary}
                onClick={handleSaveSalaryToDB}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingSalary ? 'Saving to DB...' : 'Save Base Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Payroll Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-white space-y-5 animate-float">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings2 size={20} className="text-odizo-red" />
                Global Payroll Deduction Rules
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Configure standard Loss of Pay (LOP) deduction logic per role in the <strong className="text-white">ODIZO</strong> system.
            </p>

            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div key={rule.role} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${rule.role === 'Employee' ? 'bg-purple-400' : 'bg-amber-400'}`} />
                      Role: {rule.role}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">Rule #{idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                        Deduction Type
                      </label>
                      <select
                        value={rule.type}
                        onChange={(e) => {
                          const newType = e.target.value as 'percentage' | 'fixed';
                          setRules((prev) =>
                            prev.map((r) => (r.role === rule.role ? { ...r, type: newType } : r))
                          );
                        }}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-odizo-red focus:outline-none"
                      >
                        <option value="percentage">Percentage of Base (Exact Per-Day)</option>
                        <option value="fixed">Fixed Amount (₹ / Day)</option>
                      </select>
                    </div>

                    {rule.type === 'fixed' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                          Fixed Amount (₹ / LOP Day)
                        </label>
                        <input
                          type="number"
                          value={rule.fixedAmount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRules((prev) =>
                              prev.map((r) => (r.role === rule.role ? { ...r, fixedAmount: val } : r))
                            );
                          }}
                          className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-odizo-red focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                          Formula Applied
                        </label>
                        <div className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 font-mono">
                          (Base Salary / {daysInCurrentMonth}) × LOP
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e16167] to-[#e10b14] text-white text-xs font-bold shadow-lg hover:opacity-95 transition-all"
              >
                Save & Apply Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Process Detail Modal / Side-Drawer */}
      {reviewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0a0a] border-l border-zinc-800 h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-float-in text-white">
            <div className="space-y-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-odizo-red">Payslip Verification</span>
                  <h2 className="text-xl font-bold text-white">Review & Process Salary</h2>
                </div>
                <button
                  onClick={() => setReviewingEmployee(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Employee Summary Card */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-odizo-red/10 border border-odizo-red/20 flex items-center justify-center text-odizo-red font-bold text-base">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{reviewingEmployee.name}</h3>
                  <p className="text-xs text-zinc-400">{reviewingEmployee.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-odizo-red/10 text-odizo-red border border-odizo-red/20">
                      Role: {reviewingEmployee.role}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{reviewingEmployee.id}</span>
                  </div>
                </div>
              </div>

              {/* Working Days & Proration Breakdown */}
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs">
                <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Month Schedule ({currentMonthName})</span>
                  <span className="text-emerald-400">{daysInCurrentMonth} Total Days</span>
                </h4>

                <div className="grid grid-cols-2 gap-2 text-zinc-400">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="block text-[10px]">Present Days</span>
                    <span className="text-sm font-bold text-white">{reviewingEmployee.presentDays} Days</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="block text-[10px]">Loss of Pay (LOP)</span>
                    <span className="text-sm font-bold text-rose-400">{reviewingEmployee.unpaidLeaves} Days</span>
                  </div>
                </div>
              </div>

              {/* Detailed Calculation Breakdown */}
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs">
                <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Granular Salary Computation
                </h4>

                {/* Base Salary */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Base Monthly Salary:</span>
                  <span className="font-bold text-white">
                    {isSalaryMissing(reviewingEmployee) ? 'N/A' : `₹${reviewingEmployee.baseSalary!.toLocaleString('en-IN')}`}
                  </span>
                </div>

                {/* LOP Deduction Math */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400 flex items-center gap-1">
                    LOP Deduction:
                    <span className="text-[10px] text-zinc-500">
                      ({rules.find((r) => r.role === reviewingEmployee.role)?.type === 'fixed' ? 'Fixed ₹500/day' : 'Exact Per-Day'})
                    </span>
                  </span>
                  <span className="font-bold text-rose-400">
                    -₹{calculateLopDeduction(reviewingEmployee).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Allowances */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <PlusCircle size={12} className="text-emerald-400" />
                    Allowances / Bonus:
                  </span>
                  <input
                    type="number"
                    value={reviewingEmployee.allowances}
                    onChange={(e) => handleFieldChange(reviewingEmployee.id, 'allowances', parseFloat(e.target.value) || 0)}
                    className="w-24 bg-black border border-emerald-500/40 rounded-lg px-2 py-1 text-right text-emerald-400 font-bold focus:outline-none"
                  />
                </div>

                {/* Custom Deductions */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <MinusCircle size={12} className="text-rose-400" />
                    Custom Deductions:
                  </span>
                  <input
                    type="number"
                    value={reviewingEmployee.customDeductions}
                    onChange={(e) => handleFieldChange(reviewingEmployee.id, 'customDeductions', parseFloat(e.target.value) || 0)}
                    className="w-24 bg-black border border-rose-500/40 rounded-lg px-2 py-1 text-right text-rose-400 font-bold focus:outline-none"
                  />
                </div>

                {/* Net Payable Result */}
                <div className="flex items-center justify-between pt-2 text-sm">
                  <span className="font-extrabold text-white uppercase">Final Net Payable:</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {calculateNetPayable(reviewingEmployee) === null
                      ? 'N/A'
                      : `₹${calculateNetPayable(reviewingEmployee)!.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval Action */}
            <div className="pt-6 border-t border-zinc-800 space-y-3">
              <button
                disabled={isSalaryMissing(reviewingEmployee)}
                onClick={() => handleApprovePayslip(reviewingEmployee.id)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#e16167] to-[#e10b14] text-white text-sm font-bold shadow-lg shadow-odizo-red/30 hover:opacity-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                Approve & Disburse Payslip
              </button>
              <button
                onClick={() => setReviewingEmployee(null)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors"
              >
                Cancel Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
