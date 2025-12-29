import { Component, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductMetric } from '../services/state.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full overflow-y-auto">
      <h3 class="text-lg font-semibold text-slate-800 mb-4">Add Digital Product Data</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Name -->
        <div class="col-span-1 md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
          <input type="text" formControlName="name" 
            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="e.g. Ultimate E-Book">
        </div>

        <!-- Description -->
        <div class="col-span-1 md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
          <textarea formControlName="description" rows="2"
            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
            placeholder="e.g. A comprehensive guide to scaling startups..."></textarea>
        </div>

        <!-- Price -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹)</label>
          <input type="number" formControlName="price" min="0" step="0.01"
            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>
        
        <!-- Ad Spend -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Total Ad Spend (₹)</label>
          <input type="number" formControlName="adSpend" min="0" step="0.01"
            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>

        <!-- Clicks -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Link Clicks</label>
          <input type="number" formControlName="clicks" min="0"
            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>

        <!-- Conversions -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Purchases (Conversions)</label>
          <input type="number" formControlName="conversions" min="0"
            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button type="submit" 
          [disabled]="form.invalid"
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Add Data & Generate Report
        </button>
      </div>
    </form>
  `
})
export class ProductFormComponent {
  add = output<Omit<ProductMetric, 'id' | 'dailyStats'>>();
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      adSpend: [0, [Validators.required, Validators.min(0)]],
      clicks: [0, [Validators.required, Validators.min(0)]],
      conversions: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.add.emit(this.form.value);
      this.form.reset({ name: '', description: '', price: 0, adSpend: 0, clicks: 0, conversions: 0 });
    }
  }
}