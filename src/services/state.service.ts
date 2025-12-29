import { Injectable, signal, computed } from '@angular/core';

export interface DailyStat {
  date: string;
  adSpend: number;
  revenue: number;
  sales: number;
}

export interface Expense {
  id: string;
  productId: string;
  description: string;
  amount: number;
  date: string;
}

export interface ProductMetric {
  id: string;
  name: string;
  description?: string;
  price: number;
  adSpend: number;
  clicks: number;
  conversions: number;
  dailyStats: DailyStat[];
  expenses?: Expense[];
}

export interface TestingPlan {
  id: string;
  productName: string;
  adSetIdea: string;
  notes: string;
  status: 'ongoing' | 'successful' | 'failed';
  createdAt: string;
}

export interface ComputedMetric extends ProductMetric {
  cpc: number;
  cpa: number;
  revenue: number;
  profit: number;
  roas: number;
  roi: number;
  profitPerSale: number;
  margin: number;
  totalExpenses: number;
  momProfitGrowth: number;
  yoyProfitGrowth: number;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // Helper to generate dummy daily data for demo purposes
  private generateDailyStats(totalSpend: number, totalRevenue: number, totalSales: number): DailyStat[] {
    const days = 370; // Generate 370 days of data to support YoY calculations
    const stats: DailyStat[] = [];
    const today = new Date();
    
    // Distribute totals somewhat randomly over days
    let remainingSpend = totalSpend;
    let remainingRevenue = totalRevenue;
    let remainingSales = totalSales;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const isLast = i === 0;
      // Random factors
      const factor = Math.random() * (0.1) + 0.01; // 1% to 11% chunks
      
      const daySpend = isLast ? remainingSpend : Math.floor(totalSpend * factor);
      const daySales = isLast ? remainingSales : Math.floor(totalSales * factor);
      const dayRevenue = isLast ? remainingRevenue : daySales * (totalRevenue / totalSales || 0);

      if(remainingSpend > 0) remainingSpend -= daySpend;
      if(remainingSales > 0) remainingSales -= daySales;
      if(remainingRevenue > 0) remainingRevenue -= dayRevenue;

      stats.push({
        date: date.toISOString().split('T')[0],
        adSpend: Math.max(0, daySpend),
        revenue: Math.max(0, dayRevenue),
        sales: Math.max(0, daySales)
      });
    }
    return stats;
  }

  // Initial dummy data with daily stats and costs
  private productsSignal = signal<ProductMetric[]>([
    { 
      id: '1', 
      name: 'E-Book: Growth Hacking', 
      description: 'Strategies for rapid startup growth', 
      price: 499.00, 
      adSpend: 3500, 
      clicks: 450, 
      conversions: 18,
      dailyStats: this.generateDailyStats(3500, 499 * 18, 18),
      expenses: []
    },
    { 
      id: '2', 
      name: 'Notion Template Pack', 
      description: 'Premium templates for productivity', 
      price: 1999.00, 
      adSpend: 15000, 
      clicks: 1200, 
      conversions: 15,
      dailyStats: this.generateDailyStats(15000, 1999 * 15, 15),
      expenses: []
    },
    { 
      id: '3', 
      name: 'Course: Angular Mastery', 
      description: 'Complete zero to hero Angular guide', 
      price: 4999.00, 
      adSpend: 8000, 
      clicks: 600, 
      conversions: 4,
      dailyStats: this.generateDailyStats(8000, 4999 * 4, 4),
      expenses: []
    }
  ]);
  
  private testingPlansSignal = signal<TestingPlan[]>([
    {
      id: crypto.randomUUID(),
      productName: 'E-Book: Growth Hacking',
      adSetIdea: 'Target lookalike audience from website visitors with video ads.',
      notes: 'Initial CPC is a bit high, but CTR is good. Will monitor for 3 more days before deciding.',
      status: 'ongoing',
      createdAt: new Date().toISOString()
    }
  ]);

  private lastRemovedStats: { productId: string; stats: DailyStat[] } | null = null;

  readonly products = computed(() => {
    return this.productsSignal().map(p => {
      const totalExpenses = (p.expenses || []).reduce((sum, e) => sum + e.amount, 0);
      const revenue = p.price * p.conversions;
      const profit = revenue - p.adSpend - totalExpenses;
      
      const cpc = p.clicks > 0 ? p.adSpend / p.clicks : 0;
      const cpa = p.conversions > 0 ? p.adSpend / p.conversions : 0;
      const roas = p.adSpend > 0 ? revenue / p.adSpend : 0;
      const roi = p.adSpend > 0 ? (profit / p.adSpend) * 100 : 0;
      const profitPerSale = p.conversions > 0 ? profit / p.conversions : 0;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // --- MoM & YoY Growth Calculations ---
      const parseDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
      };

      const today = new Date();
      const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      const calculateProfitForPeriod = (stats: DailyStat[], expenses: Expense[]): number => {
        const statProfit = stats.reduce((sum, s) => sum + (s.revenue - s.adSpend), 0);
        const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        return statProfit - expenseTotal;
      };

      // MoM
      const currentMonthStart = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 1));
      const prevMonthDate = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 0));
      const prevMonthStart = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), 1));
      const prevMonthComparisonEndDay = Math.min(utcToday.getUTCDate(), prevMonthDate.getUTCDate());
      const prevMonthComparisonEnd = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), prevMonthComparisonEndDay));
      
      const currentMonthStats = p.dailyStats.filter(s => { const d = parseDate(s.date); return d >= currentMonthStart && d <= utcToday; });
      const currentMonthExpenses = (p.expenses || []).filter(e => { const d = parseDate(e.date); return d >= currentMonthStart && d <= utcToday; });
      const prevMonthStats = p.dailyStats.filter(s => { const d = parseDate(s.date); return d >= prevMonthStart && d <= prevMonthComparisonEnd; });
      const prevMonthExpenses = (p.expenses || []).filter(e => { const d = parseDate(e.date); return d >= prevMonthStart && d <= prevMonthComparisonEnd; });
      
      const currentMonthProfit = calculateProfitForPeriod(currentMonthStats, currentMonthExpenses);
      const prevMonthProfit = calculateProfitForPeriod(prevMonthStats, prevMonthExpenses);

      let momProfitGrowth = 0;
      if (prevMonthProfit !== 0) {
        momProfitGrowth = ((currentMonthProfit - prevMonthProfit) / Math.abs(prevMonthProfit)) * 100;
      } else if (currentMonthProfit > 0) {
        momProfitGrowth = Infinity;
      }

      // YoY
      const currentYearStart = new Date(Date.UTC(utcToday.getUTCFullYear(), 0, 1));
      const prevYearDate = new Date(Date.UTC(utcToday.getUTCFullYear() - 1, utcToday.getUTCMonth(), utcToday.getUTCDate()));
      const prevYearStart = new Date(Date.UTC(utcToday.getUTCFullYear() - 1, 0, 1));

      const currentYearStats = p.dailyStats.filter(s => { const d = parseDate(s.date); return d >= currentYearStart && d <= utcToday; });
      const currentYearExpenses = (p.expenses || []).filter(e => { const d = parseDate(e.date); return d >= currentYearStart && d <= utcToday; });
      const prevYearStats = p.dailyStats.filter(s => { const d = parseDate(s.date); return d >= prevYearStart && d <= prevYearDate; });
      const prevYearExpenses = (p.expenses || []).filter(e => { const d = parseDate(e.date); return d >= prevYearStart && d <= prevYearDate; });

      const currentYearProfit = calculateProfitForPeriod(currentYearStats, currentYearExpenses);
      const prevYearProfit = calculateProfitForPeriod(prevYearStats, prevYearExpenses);
      
      let yoyProfitGrowth = 0;
      if (prevYearProfit !== 0) {
        yoyProfitGrowth = ((currentYearProfit - prevYearProfit) / Math.abs(prevYearProfit)) * 100;
      } else if (currentYearProfit > 0) {
        yoyProfitGrowth = Infinity;
      }

      return {
        ...p,
        revenue,
        profit,
        cpc,
        cpa,
        roas,
        roi,
        profitPerSale,
        margin,
        totalExpenses,
        momProfitGrowth,
        yoyProfitGrowth,
      } as ComputedMetric;
    });
  });

  readonly testingPlans = this.testingPlansSignal.asReadonly();
  
  readonly totalSpend = computed(() => this.products().reduce((sum, p) => sum + p.adSpend, 0));
  readonly totalRevenue = computed(() => this.products().reduce((sum, p) => sum + p.revenue, 0));
  readonly totalMiscExpenses = computed(() => this.products().reduce((sum, p) => sum + p.totalExpenses, 0));
  readonly totalProfit = computed(() => this.products().reduce((sum, p) => sum + p.profit, 0));
  readonly globalRoas = computed(() => this.totalSpend() > 0 ? this.totalRevenue() / this.totalSpend() : 0);

  readonly aggregatedDailyStats = computed(() => {
    const dailyMap = new Map<string, { adSpend: number; revenue: number; sales: number }>();

    this.productsSignal().forEach(product => {
      (product.dailyStats || []).forEach(stat => {
        const existing = dailyMap.get(stat.date) || { adSpend: 0, revenue: 0, sales: 0 };
        existing.adSpend += stat.adSpend;
        existing.revenue += stat.revenue;
        existing.sales += stat.sales;
        dailyMap.set(stat.date, existing);
      });
    });
    
    const aggregated = Array.from(dailyMap.entries()).map(([date, values]) => ({
      date,
      ...values,
    }));
    
    // Sort by date to ensure the chart is correct
    return aggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });


  addProduct(product: Omit<ProductMetric, 'id' | 'dailyStats' | 'expenses'>) {
    const newId = crypto.randomUUID();
    const revenue = product.price * product.conversions;
    
    // Auto-generate simulate daily data for the new product based on inputs
    const dailyStats = this.generateDailyStats(product.adSpend, revenue, product.conversions);

    const newProduct: ProductMetric = { 
      ...product, 
      id: newId,
      dailyStats,
      expenses: []
    };
    this.productsSignal.update(list => [...list, newProduct]);
  }

  addDailyStat(productId: string, stat: { date: string, adSpend: number, sales: number }) {
    this.productsSignal.update(products => {
      return products.map(p => {
        if (p.id === productId) {
          // Create a mutable copy
          const updatedProduct = { ...p, dailyStats: [...p.dailyStats] };

          const dailyRevenue = p.price * stat.sales;
          const newDailyStat: DailyStat = { ...stat, revenue: dailyRevenue };
          
          // Add or update the stat for the given date
          const existingStatIndex = updatedProduct.dailyStats.findIndex(d => d.date === stat.date);
          if (existingStatIndex > -1) {
            updatedProduct.dailyStats[existingStatIndex] = newDailyStat;
          } else {
            updatedProduct.dailyStats.push(newDailyStat);
          }
          
          // Sort daily stats by date
          updatedProduct.dailyStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Recalculate totals based on the full daily history
          updatedProduct.adSpend = updatedProduct.dailyStats.reduce((sum, s) => sum + s.adSpend, 0);
          updatedProduct.conversions = updatedProduct.dailyStats.reduce((sum, s) => sum + s.sales, 0);

          return updatedProduct;
        }
        return p;
      });
    });
  }

  removeDailyStat(productId: string, date: string) {
    this.productsSignal.update(products => {
      return products.map(p => {
        if (p.id === productId) {
          const updatedProduct = { ...p };

          // Filter out the specific daily stat
          updatedProduct.dailyStats = updatedProduct.dailyStats.filter(d => d.date !== date);

          // Recalculate totals from the remaining daily stats
          updatedProduct.adSpend = updatedProduct.dailyStats.reduce((sum, s) => sum + s.adSpend, 0);
          updatedProduct.conversions = updatedProduct.dailyStats.reduce((sum, s) => sum + s.sales, 0);

          return updatedProduct;
        }
        return p;
      });
    });
  }
  
  updateDailyStat(productId: string, date: string, updatedStat: { adSpend: number; sales: number }) {
    this.productsSignal.update(products => {
      return products.map(p => {
        if (p.id === productId) {
          const updatedProduct = { ...p };
          const statIndex = updatedProduct.dailyStats.findIndex(d => d.date === date);

          if (statIndex > -1) {
            // Update the specific daily stat
            const newRevenue = p.price * updatedStat.sales;
            updatedProduct.dailyStats[statIndex] = {
              date,
              adSpend: updatedStat.adSpend,
              sales: updatedStat.sales,
              revenue: newRevenue,
            };
            
            // Re-create the array to trigger change detection if needed
            updatedProduct.dailyStats = [...updatedProduct.dailyStats];

            // Recalculate totals from the updated daily stats
            updatedProduct.adSpend = updatedProduct.dailyStats.reduce((sum, s) => sum + s.adSpend, 0);
            updatedProduct.conversions = updatedProduct.dailyStats.reduce((sum, s) => sum + s.sales, 0);
          }
          return updatedProduct;
        }
        return p;
      });
    });
  }

  removeAllDailyStats(productId: string) {
    this.productsSignal.update(products => {
      return products.map(p => {
        if (p.id === productId && p.dailyStats.length > 0) {
          // Backup before removing
          this.lastRemovedStats = { productId: p.id, stats: [...p.dailyStats] };
          
          // Create a new object with cleared stats and totals
          const clearedProduct = { ...p, dailyStats: [] };
          clearedProduct.adSpend = 0;
          clearedProduct.conversions = 0;
          
          return clearedProduct;
        }
        return p;
      });
    });
  }

  revertLastRemovedDailyStats() {
    if (!this.lastRemovedStats) {
      return;
    }
    
    const { productId, stats } = this.lastRemovedStats;

    this.productsSignal.update(products => {
      return products.map(p => {
        if (p.id === productId) {
          const restoredProduct = { ...p, dailyStats: stats };
          
          // Recalculate totals from the restored data
          restoredProduct.adSpend = stats.reduce((sum, s) => sum + s.adSpend, 0);
          restoredProduct.conversions = stats.reduce((sum, s) => sum + s.sales, 0);
          
          return restoredProduct;
        }
        return p;
      });
    });

    // Clear the backup so it can't be used again
    this.lastRemovedStats = null;
  }

  updateProduct(updated: ProductMetric) {
    this.productsSignal.update(list => list.map(p => p.id === updated.id ? updated : p));
  }
  
  updateProductDetails(productId: string, updates: { name: string; description?: string; price: number; }) {
    this.productsSignal.update(products => {
      return products.map(p => {
        if (p.id === productId) {
          const originalPrice = p.price;
          const updatedProduct = { ...p, 
            name: updates.name,
            description: updates.description,
            price: updates.price,
          };

          // If price changed, recalculate daily revenue
          if (updates.price !== originalPrice) {
            updatedProduct.dailyStats = p.dailyStats.map(stat => {
              return { ...stat, revenue: updates.price * stat.sales };
            });
          }
          
          return updatedProduct;
        }
        return p;
      });
    });
  }

  addExpense(productId: string, expenseData: Omit<Expense, 'id' | 'productId'>) {
    this.productsSignal.update(products => 
      products.map(p => {
        if (p.id === productId) {
          const newExpense: Expense = {
            ...expenseData,
            id: crypto.randomUUID(),
            productId: productId,
          };
          const updatedExpenses = [...(p.expenses || []), newExpense];
          updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return { ...p, expenses: updatedExpenses };
        }
        return p;
      })
    );
  }

  removeExpense(productId: string, expenseId: string) {
    this.productsSignal.update(products => 
      products.map(p => {
        if (p.id === productId) {
          return { ...p, expenses: (p.expenses || []).filter(e => e.id !== expenseId) };
        }
        return p;
      })
    );
  }

  removeProduct(id: string) {
    this.productsSignal.update(list => list.filter(p => p.id !== id));
  }

  // --- Testing Plan Methods ---
  addTestingPlan(planData: Omit<TestingPlan, 'id' | 'status' | 'createdAt'>) {
    const newPlan: TestingPlan = {
      ...planData,
      id: crypto.randomUUID(),
      status: 'ongoing',
      createdAt: new Date().toISOString(),
    };
    this.testingPlansSignal.update(plans => [newPlan, ...plans]);
  }

  updateTestingPlanStatus(planId: string, status: 'ongoing' | 'successful' | 'failed') {
    this.testingPlansSignal.update(plans =>
      plans.map(p => (p.id === planId ? { ...p, status } : p))
    );
  }

  updateTestingPlanNotes(planId: string, notes: string) {
    this.testingPlansSignal.update(plans =>
      plans.map(p => (p.id === planId ? { ...p, notes } : p))
    );
  }

  removeTestingPlan(planId: string) {
    this.testingPlansSignal.update(plans => plans.filter(p => p.id !== planId));
  }


  getProductsForAI() {
    // Simplify for AI context to avoid token limits
    const simplified = this.products().map(({ dailyStats, expenses, ...rest }) => rest);
    return JSON.stringify(simplified, null, 2);
  }
}