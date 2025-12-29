import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StateService, TestingPlan } from '../services/state.service';

@Component({
  selector: 'app-testing-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="px-4 py-4 md:px-6 border-b border-slate-200">
        <h3 class="font-semibold text-slate-800">Ad Testing Lab</h3>
        <p class="text-sm text-slate-500 mt-1">Create and track ad set ideas to see what works.</p>
      </div>
      
      <!-- New Plan Form -->
      <div class="p-4 md:p-6 bg-slate-50/50">
        <form [formGroup]="planForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Product Name / Concept</label>
              <input type="text" formControlName="productName" placeholder="e.g. Notion Template Pack" class="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Ad Set / Angle Idea</label>
              <input type="text" formControlName="adSetIdea" placeholder="e.g. Target 'Productivity' interest" class="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea formControlName="notes" rows="2" placeholder="Initial thoughts, budget, success metrics..." class="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
          </div>
          <div class="text-right">
            <button type="submit" [disabled]="planForm.invalid" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              Create Test Plan
            </button>
          </div>
        </form>
      </div>

      <!-- Plan List -->
      <div class="p-4 md:p-6 space-y-4">
        @for (plan of state.testingPlans(); track plan.id) {
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div class="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                <div>
                    <div class="flex items-center gap-2">
                         <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                            [class]="{
                                'bg-amber-100 text-amber-800': plan.status === 'ongoing',
                                'bg-emerald-100 text-emerald-800': plan.status === 'successful',
                                'bg-rose-100 text-rose-800': plan.status === 'failed'
                            }">
                            {{ plan.status }}
                        </span>
                        <h4 class="font-bold text-slate-800">{{ plan.productName }}</h4>
                    </div>
                    <p class="text-sm text-slate-600 mt-1 ml-1">{{ plan.adSetIdea }}</p>
                </div>
                <div class="text-xs text-slate-400 font-medium flex-shrink-0 self-start sm:self-center pt-1">
                    Created: {{ formatDate(plan.createdAt) }}
                </div>
            </div>

            <!-- Notes Section -->
            <div class="bg-white p-3 rounded-md border border-slate-200/80 text-sm">
                @if (editingNotesPlanId() === plan.id) {
                    <textarea class="w-full p-1 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none resize-y min-h-[80px]"
                        [value]="editingNotesContent()"
                        (input)="editingNotesContent.set($any($event.target).value)"></textarea>
                    <div class="flex justify-end gap-2 mt-2">
                        <button (click)="cancelEditNotes()" class="text-xs font-semibold text-slate-600 px-2 py-1 rounded hover:bg-slate-100">Cancel</button>
                        <button (click)="saveNotes(plan.id)" class="text-xs font-semibold text-white px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700">Save</button>
                    </div>
                } @else {
                    <div class="text-slate-700 whitespace-pre-wrap">{{ plan.notes || 'No notes yet.'}}</div>
                    <div class="text-right mt-1">
                         <button (click)="startEditingNotes(plan)" class="text-xs font-semibold text-indigo-600 hover:underline">Edit Notes</button>
                    </div>
                }
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between pt-2">
                <div class="flex items-center gap-2">
                    <button (click)="state.updateTestingPlanStatus(plan.id, 'successful')" title="Mark as Successful"
                        class="px-2 py-1 flex items-center gap-1.5 rounded-md text-xs font-bold transition-colors"
                        [class]="plan.status === 'successful' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Works
                    </button>
                     <button (click)="state.updateTestingPlanStatus(plan.id, 'failed')" title="Mark as Failed"
                        class="px-2 py-1 flex items-center gap-1.5 rounded-md text-xs font-bold transition-colors"
                        [class]="plan.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700'">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Doesn't Work
                    </button>
                </div>
                <button (click)="state.removeTestingPlan(plan.id)" class="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 transition-colors">
                    Delete Plan
                </button>
            </div>

          </div>
        } @empty {
          <div class="text-center py-8 text-slate-400">
            No active tests. Create a new test plan above to get started!
          </div>
        }
      </div>
    </div>
  `
})
export class TestingLabComponent {
  state = inject(StateService);
  private fb = inject(FormBuilder);

  planForm: FormGroup;
  editingNotesPlanId = signal<string | null>(null);
  editingNotesContent = signal<string>('');

  constructor() {
    this.planForm = this.fb.group({
      productName: ['', Validators.required],
      adSetIdea: ['', Validators.required],
      notes: ['']
    });
  }

  onSubmit() {
    if (this.planForm.invalid) return;
    this.state.addTestingPlan(this.planForm.value);
    this.planForm.reset();
  }
  
  startEditingNotes(plan: TestingPlan) {
    this.editingNotesPlanId.set(plan.id);
    this.editingNotesContent.set(plan.notes);
  }

  saveNotes(planId: string) {
    this.state.updateTestingPlanNotes(planId, this.editingNotesContent());
    this.cancelEditNotes();
  }

  cancelEditNotes() {
    this.editingNotesPlanId.set(null);
    this.editingNotesContent.set('');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
