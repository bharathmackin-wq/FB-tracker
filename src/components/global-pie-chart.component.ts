import { Component, ElementRef, viewChild, effect, input, computed } from '@angular/core';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full flex flex-col">
      <h3 class="text-lg font-semibold text-slate-800 mb-4 px-2">Revenue vs. Spend</h3>
      <div #pieChartContainer class="flex-grow w-full min-h-[300px] relative"></div>
      
      @if(totalRevenue() > 0) {
        @if (grossProfit() >= 0) {
            <div class="flex justify-center gap-6 mt-2 text-sm text-slate-600">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-rose-500"></div> Ad Spend</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-emerald-500"></div> Gross Profit</div>
            </div>
        } @else {
            <div class="flex justify-center gap-6 mt-2 text-sm text-slate-600">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-indigo-300"></div> Revenue Recouped</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-rose-500"></div> Unrecouped Spend</div>
            </div>
        }
      }
    </div>
  `
})
export class GlobalPieChartComponent {
  totalAdSpend = input.required<number>();
  totalRevenue = input.required<number>();

  pieChartContainer = viewChild<ElementRef>('pieChartContainer');
  
  grossProfit = computed(() => this.totalRevenue() - this.totalAdSpend());

  constructor() {
    effect(() => {
      const container = this.pieChartContainer()?.nativeElement;
      if (container) {
          const adSpend = this.totalAdSpend();
          const revenue = this.totalRevenue();
          const grossProfitValue = this.grossProfit();

          if (revenue > 0) {
              if (grossProfitValue >= 0) {
                  const pieData = [
                      { label: 'Ad Spend', value: adSpend },
                      { label: 'Gross Profit', value: grossProfitValue }
                  ].filter(d => d.value > 0);
                  const colors = ['#f43f5e', '#10b981']; // Rose for spend, Emerald for profit
                  this.drawPieChart(container, pieData, colors);
              } else {
                  // Loss case: Breakdown of Ad Spend
                  const pieData = [
                      { label: 'Revenue Recouped', value: revenue },
                      { label: 'Unrecouped Spend', value: Math.abs(grossProfitValue) }
                  ].filter(d => d.value > 0);
                  const colors = ['#a5b4fc', '#f43f5e']; // Indigo for recouped, Rose for loss
                  this.drawPieChart(container, pieData, colors, 'Total Ad Spend');
              }
          } else {
             // Handle case with no revenue
             this.drawPieChart(container, [], []);
          }
      }
    });
  }

  private formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  private drawPieChart(container: HTMLElement, data: {label: string, value: number}[], colors: string[], title?: string) {
    d3.select(container).selectAll('*').remove();
    
    if (data.length === 0) {
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
        const totalRevenue = this.totalRevenue();
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
}