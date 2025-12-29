import { Component, input, effect, viewChild, ElementRef, output, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComputedMetric, StateService, DailyStat } from '../services/state.service';
import * as d3 from 'd3';

interface MonthlyBreakdown {
  month: string;
  year: number;
  monthIndex: number;
  totalSales: number;
  totalAdSpend: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
  profitChange?: number;
}

interface WeeklyBreakdown {
  week: string;
  weekStartDate: string;
  totalSales: number;
  totalAdSpend: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
  profitChange?: number;
}


@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 overflow-hidden">
      <!-- Modal Header -->
      <header class="bg-white px-4 md:px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0 z-10 gap-2">
        @if (isEditing()) {
          <div class="flex-grow" [formGroup]="detailsForm">
            <input type="text" formControlName="name" class="text-xl w-full font-bold text-slate-800 bg-white border-b-2 border-indigo-500 py-1 focus:outline-none">
            <input type="text" formControlName="description" class="text-sm w-full text-slate-500 bg-white focus:outline-none border-b py-1 mt-1">
          </div>
        } @else {
          <div class="flex-grow">
            <h2 class="text-xl font-bold text-slate-800">{{ product().name }}</h2>
            <p class="text-sm text-slate-500">{{ product().description }}</p>
          </div>
        }
        <div class="flex items-center gap-2 flex-shrink-0">
           @if (isEditing()) {
             <div [formGroup]="detailsForm" class="flex items-center gap-2">
              <input type="number" formControlName="price" class="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none">
              <button (click)="saveDetails()" [disabled]="detailsForm.invalid" class="text-emerald-600 hover:text-emerald-800 font-bold p-1 text-xs disabled:opacity-50">Save</button>
              <button (click)="toggleEdit()" class="text-slate-500 hover:text-slate-700 font-bold p-1 text-xs">Cancel</button>
             </div>
           } @else {
             <button (click)="toggleEdit()" class="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-slate-200">
               Edit
             </button>
           }
           <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 gap-4">
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">Net Profit</div>
             <div class="text-2xl font-bold" [class]="product().profit >= 0 ? 'text-emerald-600' : 'text-rose-600'">
               {{ formatCurrency(product().profit) }}
             </div>
           </div>
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">Total Revenue</div>
             <div class="text-2xl font-bold text-emerald-600">
               {{ formatCurrency(product().revenue) }}
             </div>
           </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">Total Ad Spend</div>
             <div class="text-2xl font-bold text-rose-600">
               {{ formatCurrency(product().adSpend) }}
             </div>
           </div>
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">Total Expenses</div>
             <div class="text-2xl font-bold text-rose-600">
               {{ formatCurrency(product().totalExpenses) }}
             </div>
           </div>
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">Total Sales</div>
             <div class="text-2xl font-bold text-slate-600">
               {{ product().conversions }}
             </div>
           </div>
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">ROI</div>
             <div class="text-2xl font-bold" [class]="product().roi >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                {{ product().roi.toFixed(1) }}%
             </div>
           </div>
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">Cost Per Acquisition</div>
             <div class="text-2xl font-bold" [class]="product().cpa > product().price ? 'text-rose-600' : 'text-indigo-600'">
               {{ formatCurrency(product().cpa) }}
             </div>
           </div>
           <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
             <div class="text-xs text-slate-500 uppercase font-bold">MoM Profit Growth</div>
             <div class="text-2xl font-bold" [class]="product().momProfitGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'">
               {{ formatGrowth(product().momProfitGrowth) }}
             </div>
           </div>
        </div>

        <!-- Trend Chart -->
        <div class="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 min-h-[350px] relative">
          <div class="flex justify-between items-center mb-4">
              <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                @if (chartView() === 'trend') {
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                  Daily Spend vs. Revenue Trend
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                  Financial Breakdown
                }
              </h3>
              <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button (click)="chartView.set('trend')" [class]="chartView() === 'trend' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'" class="px-3 py-1 text-xs font-semibold rounded-md transition-all">Trend</button>
                <button (click)="chartView.set('pie')" [class]="chartView() === 'pie' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'" class="px-3 py-1 text-xs font-semibold rounded-md transition-all">Breakdown</button>
              </div>
          </div>

          @if(chartView() === 'trend') {
            <div #trendChartContainer class="w-full h-[300px]"></div>
            <div class="flex justify-center gap-6 mt-4 text-xs font-medium">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Revenue</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Ad Spend</span>
            </div>
          } @else {
            <div #pieChartContainer class="w-full h-[300px]"></div>
            @if (product().profit >= 0) {
                <div class="flex justify-center gap-6 mt-4 text-xs font-medium">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Ad Spend</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Net Profit</span>
                </div>
            } @else {
                <div class="flex justify-center gap-6 mt-4 text-xs font-medium">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-300"></span> Revenue Recouped</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Net Loss</span>
                </div>
            }
          }
        </div>

        <!-- Miscellaneous Expenses -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200">
            <h3 class="font-semibold text-slate-800">Miscellaneous Expenses</h3>
          </div>
          <div class="p-6 bg-slate-50/50">
            <form [formGroup]="expenseForm" (ngSubmit)="onAddExpense()" class="space-y-4 md:space-y-0 md:grid md:grid-cols-[1fr,1fr,1fr,auto] md:gap-4 md:items-end">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input type="text" formControlName="description" placeholder="e.g. Software Subscription" class="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
               <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input type="date" formControlName="date" class="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                <input type="number" formControlName="amount" placeholder="e.g. 500" class="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <button type="submit" [disabled]="expenseForm.invalid" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">Add Expense</button>
              </div>
            </form>
          </div>
          <div class="max-h-[250px] overflow-y-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-500 uppercase font-medium text-xs sticky top-0">
                <tr>
                  <th class="px-6 py-3">Date</th>
                  <th class="px-6 py-3">Description</th>
                  <th class="px-6 py-3 text-right">Amount</th>
                  <th class="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for(expense of product().expenses; track expense.id) {
                  <tr class="group hover:bg-slate-50">
                    <td class="px-6 py-3 whitespace-nowrap">{{ formatDate(expense.date) }}</td>
                    <td class="px-6 py-3 text-slate-700">{{ expense.description }}</td>
                    <td class="px-6 py-3 text-right text-rose-600 font-mono">{{ formatCurrency(expense.amount) }}</td>
                    <td class="px-6 py-3 text-center">
                      @if (expenseToRemoveId() === expense.id) {
                        <div class="flex items-center justify-center gap-2">
                          <button (click)="confirmRemoveExpense()" class="font-semibold text-rose-600 hover:text-rose-800 text-xs">Confirm</button>
                          <button (click)="cancelRemoveExpense()" class="font-semibold text-slate-500 hover:text-slate-700 text-xs">Cancel</button>
                        </div>
                      } @else {
                        <button (click)="requestRemoveExpense(expense.id)" class="text-rose-500 hover:text-rose-700 font-bold p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Remove expense">
                          Remove
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-slate-400">
                      No miscellaneous expenses recorded.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>


        <!-- Daily Table -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 class="font-semibold text-slate-800">Daily Ad Performance</h3>
            @if (showRevert()) {
                <div class="flex items-center gap-3">
                    <span class="text-sm text-slate-500">All daily data removed.</span>
                    <button (click)="onRevert()" class="text-sm font-semibold text-indigo-600 hover:underline">Undo</button>
                </div>
            } @else {
                <div class="flex items-center gap-2">
                    @if (product().dailyStats.length > 0) {
                        <button (click)="handleRemoveAllClick()" 
                            [class]="removeAllConfirm() ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-rose-100 hover:bg-rose-200 text-rose-700'"
                            class="px-3 py-1 rounded-md text-xs font-bold transition-colors">
                            {{ removeAllConfirm() ? 'Confirm Removal' : 'Remove All' }}
                        </button>
                    }
                    @if (!removeAllConfirm()) {
                      <button (click)="openAddDataModal()" class="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-indigo-200">
                        Add Daily Data
                      </button>
                    }
                </div>
            }
          </div>
          <div class="max-h-[400px] overflow-y-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-500 uppercase font-medium text-xs sticky top-0">
                <tr>
                  <th class="px-6 py-3">Date</th>
                  <th class="px-6 py-3 text-right">Sales</th>
                  <th class="px-6 py-3 text-right">Ad Spend</th>
                  <th class="px-6 py-3 text-right">Revenue</th>
                  <th class="px-6 py-3 text-right">Ad Profit</th>
                  <th class="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (day of product().dailyStats; track day.date) {
                    <tr class="group hover:bg-slate-50">
                      <td class="px-6 py-3">
                        <div class="font-medium text-slate-800 whitespace-nowrap">{{ formatDate(day.date) }}</div>
                      </td>
                      <td class="px-6 py-3 text-right font-medium">{{ day.sales }}</td>
                      <td class="px-6 py-3 text-right text-rose-600 font-mono">{{ formatCurrency(day.adSpend) }}</td>
                      <td class="px-6 py-3 text-right text-emerald-600 font-mono">{{ formatCurrency(day.revenue) }}</td>
                      <td class="px-6 py-3 text-right font-bold text-slate-700">
                        {{ formatCurrency(day.revenue - day.adSpend) }}
                      </td>
                      <td class="px-6 py-3 text-center">
                        <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button (click)="onRemoveDailyData(day.date)" class="text-rose-500 hover:text-rose-700 font-bold p-1 text-xs" title="Remove this entry">
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                      No daily ad data recorded for this product.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Monthly Breakdown -->
        <div class="space-y-4">
          <h3 class="font-semibold text-slate-800 text-lg">Monthly Performance Breakdown</h3>
          
          @if(monthlyBreakdown().length > 0) {
              <div class="relative">
                  <div class="flex items-center space-x-2 overflow-x-auto pb-3 -mx-4 px-4">
                      @for(month of monthlyBreakdown(); track month.month) {
                          <button 
                              (click)="selectMonth(month.month)"
                              [class]="activeMonthName() === month.month ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'"
                              class="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200">
                              {{ month.month }}
                          </button>
                      }
                  </div>
              </div>
          }

          @if (activeMonthData(); as month) {
              <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
                  <div class="flex justify-between items-center mb-4">
                      <h4 class="font-bold text-slate-800 text-xl">{{ month.month }}</h4>
                      @if (month.profitChange !== undefined) {
                      <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                          [class]="month.profitChange >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                          {{ formatGrowth(month.profitChange) }} vs prev. month
                      </span>
                      }
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4">
                      <div class="border-l-4 pl-4 py-1" [class]="month.netProfit >= 0 ? 'border-emerald-500' : 'border-rose-500'">
                          <div class="text-xs text-slate-500 uppercase font-bold">Net Profit</div>
                          <div class="text-2xl font-bold mt-1" [class]="month.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatCurrency(month.netProfit) }}</div>
                      </div>
                      <div class="border-l-4 border-emerald-400 pl-4 py-1">
                          <div class="text-xs text-slate-500 uppercase font-bold">Revenue</div>
                          <div class="text-xl font-bold text-emerald-600 mt-1">{{ formatCurrency(month.totalRevenue) }}</div>
                      </div>
                      <div class="border-l-4 border-rose-400 pl-4 py-1">
                          <div class="text-xs text-slate-500 uppercase font-bold">Ad Spend</div>
                          <div class="text-xl font-bold text-rose-600 mt-1">{{ formatCurrency(month.totalAdSpend) }}</div>
                      </div>
                       <div class="border-l-4 border-rose-500 pl-4 py-1">
                          <div class="text-xs text-slate-500 uppercase font-bold">Expenses</div>
                          <div class="text-xl font-bold text-rose-700 mt-1">{{ formatCurrency(month.totalExpenses) }}</div>
                      </div>
                      <div class="border-l-4 border-slate-400 pl-4 py-1">
                          <div class="text-xs text-slate-500 uppercase font-bold">Sales</div>
                          <div class="text-xl font-bold text-slate-800 mt-1">{{ month.totalSales }}</div>
                      </div>
                  </div>
              </div>
          } @else {
              <div class="bg-white text-center p-8 rounded-lg shadow-sm border border-slate-200 text-slate-500">
                  <span>Not enough data for a monthly breakdown.</span>
              </div>
          }
        </div>
      </div>
    </div>
    
    <!-- Add Daily Data Modal -->
    @if (showAddDataModal()) {
      <div class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 relative">
          <form [formGroup]="dailyDataForm" (ngSubmit)="onAddDailyData()">
            <div class="p-6">
              <h3 class="text-lg font-semibold text-slate-800">Add Daily Metrics</h3>
              <p class="text-sm text-slate-500 mt-1">Enter sales and spend for a specific day.</p>
            </div>
            
            <div class="px-6 pb-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" formControlName="date" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Ad Spend (₹)</label>
                <input type="number" formControlName="adSpend" min="0" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Sales (Conversions)</label>
                <input type="number" formControlName="sales" min="0" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
            </div>

            <div class="bg-slate-50 p-4 flex justify-end gap-3">
              <button type="button" (click)="closeAddDataModal()" class="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors">Cancel</button>
              <button type="submit" [disabled]="dailyDataForm.invalid" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">Save Data</button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class ProductDetailComponent implements OnDestroy {
  product = input.required<ComputedMetric>();
  close = output<void>();
  
  trendChartContainer = viewChild<ElementRef>('trendChartContainer');
  pieChartContainer = viewChild<ElementRef>('pieChartContainer');

  private state = inject(StateService);
  private fb = inject(FormBuilder);

  isEditing = signal(false);
  showAddDataModal = signal(false);
  dailyDataForm: FormGroup;
  expenseForm: FormGroup;
  detailsForm: FormGroup;
  
  expenseToRemoveId = signal<string | null>(null);
  activeMonthName = signal<string | null>(null);
  chartView = signal<'trend' | 'pie'>('trend');

  removeAllConfirm = signal(false);
  showRevert = signal(false);
  private revertTimeoutId: any;
  private confirmTimeoutId: any;

  monthlyBreakdown = computed<MonthlyBreakdown[]>(() => {
    const dailyStats = this.product().dailyStats;
    const expenses = this.product().expenses || [];
    if (dailyStats.length === 0 && expenses.length === 0) return [];
    
    const monthlyMap = new Map<string, { sales: number; adSpend: number; revenue: number; expenses: number }>();

    for (const stat of dailyStats) {
        const monthKey = stat.date.substring(0, 7); // "YYYY-MM"
        const current = monthlyMap.get(monthKey) || { sales: 0, adSpend: 0, revenue: 0, expenses: 0 };
        current.sales += stat.sales;
        current.adSpend += stat.adSpend;
        current.revenue += stat.revenue;
        monthlyMap.set(monthKey, current);
    }

    for (const expense of expenses) {
      const monthKey = expense.date.substring(0, 7);
      const current = monthlyMap.get(monthKey) || { sales: 0, adSpend: 0, revenue: 0, expenses: 0 };
      current.expenses += expense.amount;
      monthlyMap.set(monthKey, current);
    }

    const breakdown: MonthlyBreakdown[] = Array.from(monthlyMap.entries()).map(([key, value]) => {
        const [year, monthNum] = key.split('-').map(Number);
        const netProfit = value.revenue - value.adSpend - value.expenses;
        const roi = value.adSpend > 0 ? (netProfit / value.adSpend) * 100 : 0;
        const date = new Date(Date.UTC(year, monthNum - 1, 2));
        const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

        return {
            month: monthName,
            year: year,
            monthIndex: monthNum - 1,
            totalSales: value.sales,
            totalAdSpend: value.adSpend,
            totalRevenue: value.revenue,
            totalExpenses: value.expenses,
            netProfit: netProfit,
            roi: roi,
        };
    });

    breakdown.sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex);

    for (let i = 0; i < breakdown.length - 1; i++) {
        const currentMonth = breakdown[i];
        const prevMonth = breakdown[i + 1];
        
        const isConsecutive = (currentMonth.year === prevMonth.year && currentMonth.monthIndex === prevMonth.monthIndex + 1) ||
                              (currentMonth.year === prevMonth.year + 1 && currentMonth.monthIndex === 0 && prevMonth.monthIndex === 11);

        if (isConsecutive) {
          const prevProfit = prevMonth.netProfit;
          if (prevProfit !== 0) {
              currentMonth.profitChange = ((currentMonth.netProfit - prevProfit) / Math.abs(prevProfit)) * 100;
          } else if (currentMonth.netProfit > 0) {
              currentMonth.profitChange = Infinity;
          } else {
              currentMonth.profitChange = 0;
          }
        }
    }
    
    return breakdown;
  });
  
  private initializeActiveMonth = effect(() => {
    const breakdown = this.monthlyBreakdown();
    if (breakdown.length > 0) {
      const currentActive = this.activeMonthName();
      if (!currentActive || !breakdown.some(m => m.month === currentActive)) {
        this.activeMonthName.set(breakdown[0].month);
      }
    } else {
      this.activeMonthName.set(null);
    }
  }, { allowSignalWrites: true });

  activeMonthData = computed(() => {
    const activeName = this.activeMonthName();
    if (!activeName) {
        return null;
    }
    return this.monthlyBreakdown().find(m => m.month === activeName) || null;
  });

  constructor() {
    this.dailyDataForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      adSpend: [0, [Validators.required, Validators.min(0)]],
      sales: [0, [Validators.required, Validators.min(0)]]
    });

    this.expenseForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
    });

    this.detailsForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]]
    });

    effect(() => {
      const container = this.trendChartContainer()?.nativeElement;
      if (this.chartView() === 'trend' && container) {
        const data = this.product().dailyStats;
        this.drawTrendChart(container, data || []);
      }
    });

    effect(() => {
      const container = this.pieChartContainer()?.nativeElement;
      if (this.chartView() === 'pie' && container) {
          const product = this.product();
          if (product.profit >= 0) {
              const pieData = [
                  { label: 'Ad Spend', value: product.adSpend },
                  { label: 'Net Profit', value: product.profit }
              ].filter(d => d.value > 0);
              const colors = ['#f43f5e', '#10b981']; 
              this.drawPieChart(container, pieData, colors);
          } else {
              const pieData = [
                  { label: 'Revenue Recouped', value: product.revenue },
                  { label: 'Net Loss', value: Math.abs(product.profit) }
              ].filter(d => d.value > 0);
              const colors = ['#a5b4fc', '#f43f5e'];
              this.drawPieChart(container, pieData, colors, 'Ad Spend Breakdown');
          }
      }
    });
  }
  
  ngOnDestroy() {
    clearTimeout(this.revertTimeoutId);
    clearTimeout(this.confirmTimeoutId);
  }

  handleRemoveAllClick() {
    if (this.removeAllConfirm()) {
      clearTimeout(this.confirmTimeoutId);

      this.state.removeAllDailyStats(this.product().id);
      this.removeAllConfirm.set(false);
      this.showRevert.set(true);

      this.revertTimeoutId = setTimeout(() => {
        this.showRevert.set(false);
      }, 7000); // 7 seconds to revert

    } else {
      this.removeAllConfirm.set(true);
      this.confirmTimeoutId = setTimeout(() => {
        this.removeAllConfirm.set(false);
      }, 3000); // 3 seconds to confirm
    }
  }

  onRevert() {
    clearTimeout(this.revertTimeoutId);
    this.state.revertLastRemovedDailyStats();
    this.showRevert.set(false);
  }

  toggleEdit() {
    this.isEditing.update(editing => !editing);
    if (this.isEditing()) {
      this.detailsForm.patchValue({
        name: this.product().name,
        description: this.product().description || '',
        price: this.product().price
      });
    }
  }

  saveDetails() {
    if (this.detailsForm.invalid) return;
    this.state.updateProductDetails(this.product().id, this.detailsForm.value);
    this.isEditing.set(false);
  }

  selectMonth(monthName: string) {
    this.activeMonthName.set(monthName);
  }

  openAddDataModal() {
    this.showAddDataModal.set(true);
  }

  closeAddDataModal() {
    this.showAddDataModal.set(false);
  }

  onAddDailyData() {
    if (this.dailyDataForm.valid) {
      const { date, adSpend, sales } = this.dailyDataForm.value;
      this.state.addDailyStat(this.product().id, { date, adSpend, sales });
      this.closeAddDataModal();
    }
  }

  onRemoveDailyData(date: string) {
    this.state.removeDailyStat(this.product().id, date);
  }

  onAddExpense() {
    if(this.expenseForm.invalid) return;
    this.state.addExpense(this.product().id, this.expenseForm.value);
    this.expenseForm.reset({
      description: '',
      amount: null,
      date: new Date().toISOString().split('T')[0]
    });
  }

  requestRemoveExpense(expenseId: string) {
    this.expenseToRemoveId.set(expenseId);
  }

  confirmRemoveExpense() {
    const expenseId = this.expenseToRemoveId();
    if (expenseId) {
      this.state.removeExpense(this.product().id, expenseId);
    }
    this.expenseToRemoveId.set(null);
  }

  cancelRemoveExpense() {
    this.expenseToRemoveId.set(null);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  formatGrowth(value: number): string {
    if (value === Infinity) {
      return 'New Profit';
    }
    if (!isFinite(value) || isNaN(value)) {
      return 'N/A';
    }
    const sign = value >= 0 ? '▲ ' : '▼ ';
    return `${sign}${Math.abs(value).toFixed(1)}%`;
  }

  formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private drawPieChart(container: HTMLElement, data: {label: string, value: number}[], colors: string[], title?: string) {
    d3.select(container).selectAll('*').remove();
    
    if (data.every(d => d.value === 0) || data.length === 0) {
          d3.select(container).append('div')
            .attr('class', 'flex items-center justify-center h-full text-slate-400')
            .text('Not enough data for breakdown.');
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2 * 0.8;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal<string>().domain(data.map(d => d.label)).range(colors);

    const pie = d3.pie<{label: string, value: number}>()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc<any, d3.DefaultArcObject>()
        .innerRadius(radius * 0.5) // Donut chart
        .outerRadius(radius);

    const path = svg.selectAll('path')
        .data(pie(data))
        .enter().append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.label))
        .attr('stroke', 'white')
        .style('stroke-width', '2px');
    
    if (title) {
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.3em')
            .text(title)
            .attr('class', 'text-xs text-slate-500');
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.8em')
            .text(this.formatCurrency(totalValue))
            .attr('class', 'text-2xl font-bold text-slate-800');
    } else {
        const totalRevenue = this.product().revenue;
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.3em')
            .text('Total Revenue')
            .attr('class', 'text-xs text-slate-500');
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.8em')
            .text(this.formatCurrency(totalRevenue))
            .attr('class', 'text-2xl font-bold text-slate-800');
    }
  }

  private drawTrendChart(container: HTMLElement, data: any[]) {
    d3.select(container).selectAll('*').remove();
    
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const margin = { top: 20, right: 30, bottom: 60, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(sortedData, d => new Date(d.date)) as [Date, Date] || [new Date(), new Date()])
      .range([0, width]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(width / 80))).tickFormat(d3.timeFormat('%b %d') as any))
      .attr('class', 'text-slate-400 text-xs')
      .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    const yMax = d3.max(sortedData, d => Math.max(d.revenue, d.adSpend)) || 1000;
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height, 0]);

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + ''))
      .attr('class', 'text-slate-400 text-xs');
      
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5);

    const revenueLine = d3.line<any>()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    const spendLine = d3.line<any>()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.adSpend))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('d', revenueLine);

    svg.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 2)
      .attr('d', spendLine);
  }
}