import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StateService, ProductMetric, ComputedMetric } from './services/state.service';
import { GeminiService } from './services/gemini.service';
import { KpiCardComponent } from './components/kpi-card.component';
import { GlobalTrendChartComponent } from './components/global-trend-chart.component';
import { ProductFormComponent } from './components/product-form.component';
import { ProductDetailComponent } from './components/product-detail.component';
import { TestingLabComponent } from './components/testing-lab.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, KpiCardComponent, GlobalTrendChartComponent, ProductFormComponent, ProductDetailComponent, TestingLabComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  state = inject(StateService);
  private gemini = inject(GeminiService);
  private fb = inject(FormBuilder);

  isAnalyzing = signal(false);
  showAiOverlay = signal(false);
  showAddProductModal = signal(false);
  isSidebarOpen = signal(false);
  
  selectedProductId = signal<string | null>(null);
  
  // Signals and form for inline editing
  editingProductId = signal<string | null>(null);
  editForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]]
  });
  
  selectedProduct = computed(() => 
    this.state.products().find(p => p.id === this.selectedProductId()) || null
  );

  aiContent = signal('');

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  getRoasLabel(roas: number): string {
    if (roas < 1) return 'Loss';
    if (roas < 2) return 'Break-even';
    if (roas < 4) return 'Profitable';
    return 'Excellent';
  }

  async analyzeWithAI() {
    this.isAnalyzing.set(true);
    this.showAiOverlay.set(true);
    this.aiContent.set(''); // Clear previous

    const dataContext = this.state.getProductsForAI();
    
    const analysis = await this.gemini.analyzePerformance(dataContext);
    
    this.aiContent.set(analysis);
    this.isAnalyzing.set(false);
  }

  closeAiOverlay() {
    this.showAiOverlay.set(false);
  }

  openAddProductModal() {
    this.showAddProductModal.set(true);
  }

  closeAddProductModal() {
    this.showAddProductModal.set(false);
  }

  onProductAdded(product: Omit<ProductMetric, 'id' | 'dailyStats'>) {
    this.state.addProduct(product);
    this.closeAddProductModal();
  }

  viewProductDetails(id: string) {
    this.selectedProductId.set(id);
    this.isSidebarOpen.set(false); // Close sidebar on navigation
  }

  closeProductDetails() {
    this.selectedProductId.set(null);
  }
  
  // New methods for inline editing
  startEditing(product: ComputedMetric): void {
    this.editingProductId.set(product.id);
    this.editForm.setValue({
      name: product.name,
      price: product.price
    });
  }

  cancelEdit(): void {
    this.editingProductId.set(null);
  }

  saveEdit(): void {
    if (this.editForm.invalid) return;

    const productId = this.editingProductId();
    if (!productId) return;
    
    const product = this.state.products().find(p => p.id === productId);
    if (!product) return;

    const { name, price } = this.editForm.value;

    this.state.updateProductDetails(productId, {
      name,
      price,
      description: product.description
    });

    this.editingProductId.set(null);
  }

  formatAiResponse(text: string): string {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\* /g, '• ');
    
    return `<p>${formatted}</p>`;
  }
}