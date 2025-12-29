import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div class="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">{{ label() }}</div>
      <div class="flex items-baseline gap-2">
        <div class="text-3xl font-bold text-slate-800">{{ value() }}</div>
        @if (subtext()) {
          <div [class]="subtextClass()" class="text-sm font-medium">{{ subtext() }}</div>
        }
      </div>
    </div>
  `
})
export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  subtext = input<string>();
  trend = input<'positive' | 'negative' | 'neutral'>('neutral');

  subtextClass = computed(() => {
    switch (this.trend()) {
      case 'positive': return 'text-emerald-600';
      case 'negative': return 'text-rose-600';
      default: return 'text-slate-400';
    }
  });
}