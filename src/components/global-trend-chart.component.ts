import { Component, ElementRef, viewChild, effect, input, signal, computed } from '@angular/core';
import * as d3 from 'd3';
import { DailyStat } from '../services/state.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full flex flex-col">
      <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 px-2 gap-3">
        <h3 class="text-lg font-semibold text-slate-800">Global Trend</h3>
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
          @for (range of timeRanges; track range.key) {
            <button 
              (click)="selectedTimeRange.set(range.key)"
              class="px-3 py-1 text-xs font-semibold rounded-md transition-all"
              [class]="selectedTimeRange() === range.key ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'">
              {{ range.label }}
            </button>
          }
        </div>
      </div>
      <div #chartContainer class="flex-grow w-full min-h-[300px] relative"></div>
      <div class="flex justify-center gap-6 mt-2 text-sm text-slate-600">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-emerald-500 rounded-sm"></div> Revenue
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-rose-500 rounded-sm"></div> Ad Spend
        </div>
      </div>
    </div>
  `
})
export class GlobalTrendChartComponent {
  data = input.required<DailyStat[]>();
  chartContainer = viewChild<ElementRef>('chartContainer');

  timeRanges = [
    { key: '7d', label: '7D' },
    { key: '14d', label: '14D' },
    { key: '30d', label: '30D' },
  ];
  selectedTimeRange = signal<'7d' | '14d' | '30d'>('14d');

  filteredData = computed(() => {
    const allData = this.data();
    const range = this.selectedTimeRange();
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    
    // Assuming data is sorted by date
    return allData.slice(-days);
  });

  constructor() {
    effect(() => {
      const container = this.chartContainer()?.nativeElement;
      const dataset = this.filteredData();
      
      if (container) {
        this.drawChart(container, dataset);
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

  private drawChart(container: HTMLElement, data: DailyStat[]) {
    d3.select(container).selectAll('*').remove();

    if (data.length < 2) {
      d3.select(container).append('div')
        .attr('class', 'flex items-center justify-center h-full text-slate-400 text-sm p-4 text-center')
        .text('Not enough data to display trend. Please add more daily stats.');
      return;
    }

    const margin = { top: 20, right: 30, bottom: 60, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Axis
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
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

    // Y Axis
    const yMax = d3.max(data, d => Math.max(d.revenue, d.adSpend)) || 1000;
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height, 0]);

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `₹${d3.format("~s")(d)}`))
      .attr('class', 'text-slate-400 text-xs');
      
    // Grid
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5);

    // Line Generators
    const revenueLine = d3.line<any>()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    const spendLine = d3.line<any>()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.adSpend))
      .curve(d3.curveMonotoneX);

    // Paths
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981') // Emerald
      .attr('stroke-width', 2.5)
      .attr('d', revenueLine);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e') // Rose
      .attr('stroke-width', 2.5)
      .attr('d', spendLine);

    // Tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'absolute opacity-0 pointer-events-none bg-slate-800 text-white text-xs rounded-lg shadow-lg p-2 z-10')
      .style('transition', 'opacity 0.2s');

    const focus = svg.append('g')
      .attr('class', 'focus')
      .style('display', 'none');

    focus.append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    const focusCircleRev = focus.append('circle').attr('r', 5).attr('fill', '#10b981').attr('stroke', 'white').attr('stroke-width', 2);
    const focusCircleSpend = focus.append('circle').attr('r', 5).attr('fill', '#f43f5e').attr('stroke', 'white').attr('stroke-width', 2);
    
    const bisectDate = d3.bisector((d: any) => new Date(d.date)).left;

    const mousemove = (event: MouseEvent) => {
      if (data.length === 0) return;
      
      const x0 = x.invert(d3.pointer(event, svg.node())[0]);
      const i = bisectDate(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      
      let d = d0;
      if (d1) {
        d = (x0.getTime() - new Date(d0.date).getTime()) > (new Date(d1.date).getTime() - x0.getTime()) ? d1 : d0;
      }
      if (!d) return;

      const date = new Date(d.date);
      const xPos = x(date);
      
      focus.attr('transform', `translate(${xPos},0)`);
      focusCircleRev.attr('cy', y(d.revenue));
      focusCircleSpend.attr('cy', y(d.adSpend));

      tooltip.html(`
        <div class="font-bold mb-1">${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Revenue: ${this.formatCurrency(d.revenue)}</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-rose-500"></span>Spend: ${this.formatCurrency(d.adSpend)}</div>
      `);
      
      const tooltipNode = tooltip.node() as HTMLElement;
      const tooltipBounds = tooltipNode.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();
      
      let left = xPos + margin.left + 15;
      let top = d3.pointer(event)[1] - tooltipBounds.height / 2;

      if (left + tooltipBounds.width > containerBounds.width - margin.right) {
        left = xPos + margin.left - 15 - tooltipBounds.width;
      }
      if (top < 0) top = 5;
      if (top + tooltipBounds.height > container.clientHeight) top = container.clientHeight - tooltipBounds.height - 5;

      tooltip.style('left', `${left}px`).style('top', `${top}px`);
    };

    svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => { focus.style('display', null); tooltip.style('opacity', 1); })
      .on('mouseout', () => { focus.style('display', 'none'); tooltip.style('opacity', 0); })
      .on('mousemove', mousemove);
  }
}