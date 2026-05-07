'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, AlertTriangle } from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const SPECIALTIES = [
  'Family Medicine',
  'Pediatrics',
  'OB/GYN',
  'Behavioral Health',
  'Dental',
  'Internal Medicine',
  'HIV',
  'Cardiology',
  'Acupuncture',
  'Chiropractic',
  'Podiatry',
  'Optometry',
  'Pharmacy',
  'Gastroenterology',
  'Urology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
];

interface DuplicateMatch {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string | null;
}

interface AddProspectModalProps {
  /** When true, stays on current page after creation instead of navigating to company detail */
  stayOnPage?: boolean;
}

export function AddProspectModal({ stayOnPage = false }: AddProspectModalProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('TX');
  const [prospectSource, setProspectSource] = useState('referral');
  const [annualReviewCount, setAnnualReviewCount] = useState('');
  const [reviewCycle, setReviewCycle] = useState('quarterly');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [onboardingNotes, setOnboardingNotes] = useState('');
  // Fields from Add Company
  const [initialStatus, setInitialStatus] = useState('lead');
  const [perReviewRate, setPerReviewRate] = useState('');
  const [fyStartMonth, setFyStartMonth] = useState('1');
  const [customMonths, setCustomMonths] = useState('');

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function resetForm() {
    setName('');
    setContactPerson('');
    setContactEmail('');
    setContactPhone('');
    setAddress('');
    setCity('');
    setState('TX');
    setProspectSource('referral');
    setAnnualReviewCount('');
    setReviewCycle('quarterly');
    setSpecialties([]);
    setOnboardingNotes('');
    setInitialStatus('lead');
    setPerReviewRate('');
    setFyStartMonth('1');
    setCustomMonths('');
    setError(null);
    setDuplicates(null);
  }

  function composeNotes(): string {
    const parts: string[] = [];
    if (specialties.length > 0) parts.push(`Specialties: ${specialties.join(', ')}`);
    if (onboardingNotes.trim()) parts.push(onboardingNotes.trim());
    return parts.join('\n\n');
  }

  async function submit(forceCreate = false) {
    if (!name.trim() || !contactPerson.trim() || !contactEmail.trim() || !state) {
      setError('Please fill in all required fields.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
    if (!emailOk) {
      setError('Please enter a valid contact email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map review cadence to DB fields
      let cadencePeriodType = reviewCycle;
      let cadencePeriodMonths: number | null = null;
      if (reviewCycle === 'semi-annual') { cadencePeriodType = 'custom_multi_month'; cadencePeriodMonths = 6; }
      else if (reviewCycle === 'annual') { cadencePeriodType = 'custom_multi_month'; cadencePeriodMonths = 12; }
      else if (reviewCycle === 'custom') { cadencePeriodType = 'custom_multi_month'; cadencePeriodMonths = customMonths ? Number(customMonths) : 3; }

      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state,
          prospectSource,
          annualReviewCount: annualReviewCount ? Number(annualReviewCount) : null,
          reviewCycle,
          onboardingNotes: composeNotes() || null,
          forceCreate,
          // New fields
          status: initialStatus,
          perReviewRate: perReviewRate ? Number(perReviewRate) : null,
          cadencePeriodType,
          fiscalYearStartMonth: Number(fyStartMonth),
          cadencePeriodMonths,
        }),
      });

      if (res.status === 409) {
        const body = await res.json();
        setDuplicates(body.matches || []);
        setError(body.message || 'Potential duplicate found.');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create prospect.');
      }

      const data = await res.json();
      const newId = data?.id;
      toast({ title: 'Company created', description: `${name.trim()} has been added.` });
      setOpen(false);
      resetForm();
      if (stayOnPage) {
        router.refresh();
      } else if (newId) {
        router.push(`/companies/${newId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="add-prospect" className="bg-brand text-white hover:bg-brand-hover">
          <Plus className="mr-2 h-4 w-4" />
          Add New Company
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border border-border-subtle shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Enter the company details. You can refine after the intro call.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example Community Health"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prospectSource">Source</Label>
              <Select value={prospectSource} onValueChange={setProspectSource}>
                <SelectTrigger id="prospectSource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualReviewCount">Annual Review Count</Label>
              <Input
                id="annualReviewCount"
                type="number"
                min={0}
                value={annualReviewCount}
                onChange={(e) => setAnnualReviewCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewCycle">Review Cadence</Label>
              <Select value={reviewCycle} onValueChange={setReviewCycle}>
                <SelectTrigger id="reviewCycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reviewCycle === 'custom' && (
              <div className="space-y-2">
                <Label>Period Length (months)</Label>
                <Input
                  type="number"
                  min={2}
                  max={12}
                  placeholder="e.g. 2"
                  value={customMonths}
                  onChange={(e) => setCustomMonths(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Fiscal Year Start</Label>
              <Select value={fyStartMonth} onValueChange={setFyStartMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Per-Review Rate ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="90.00"
                value={perReviewRate}
                onChange={(e) => setPerReviewRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select value={initialStatus} onValueChange={setInitialStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboardingNotes">Notes</Label>
            <Textarea
              id="onboardingNotes"
              value={onboardingNotes}
              onChange={(e) => setOnboardingNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this company..."
            />
          </div>

          {error && !duplicates && (
            <p className="text-sm text-status-danger-dot">{error}</p>
          )}

          {duplicates && duplicates.length > 0 && (
            <div className="rounded-md border border-status-warning-dot bg-status-warning-bg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[#F59E0B]" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-[#F59E0B]">Possible duplicate</p>
                  <p className="text-xs text-ink-200">{error}</p>
                  <ul className="space-y-1 text-xs text-ink-tertiary">
                    {duplicates.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink-primary">{d.name}</span>
                        <span className="text-ink-tertiary">
                          {[d.city, d.state].filter(Boolean).join(', ')} · {d.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDuplicates(null);
                        setError(null);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#F59E0B] text-[#172554] hover:bg-[#d98806]"
                      onClick={() => submit(true)}
                      disabled={loading}
                    >
                      These are different — create anyway
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand text-white hover:bg-brand-hover"
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
