'use client';

import { useEffect, useState } from 'react';
import { Calculator, Lock, Smartphone, CheckCircle, AlertTriangle, FileText, Copy, QrCode } from 'lucide-react';
import { Card, Button, Spinner, Input, Select, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { api } from '@/lib/api';

type EntitlementStatus = { active: boolean; activated_at: string | null };

type CostItem = {
  item: string;
  eligible: boolean;
  reason: string;
  max_claimable: number;
  calculation: string;
  required_documents: string[];
};

type CalculatorResult = {
  input_summary: {
    training_type: string;
    trainer_type: string;
    venue: string;
    course_category: string;
    duration: string;
    pax: number;
    days: number;
  };
  cost_items: CostItem[];
  total_claimable: number;
  financial_assistance_rate: number;
  net_claimable: number;
  notes: string[];
};

// ---- Activation Gate ----

function ActivationGate({ onActivated }: { onActivated: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState<{ session_token: string } | null>(null);

  async function handleActivate() {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const res = await api.post('/employer/activate', { code: code.trim().toUpperCase() });
    setLoading(false);
    if (res.success) {
      onActivated();
    } else {
      setError(res.message || 'Invalid activation code');
    }
  }

  async function handleShowQr() {
    setShowQr(true);
    const res = await api.get<{ session_token: string }>('/employer/activation-qr');
    if (res.success && res.data) {
      setQrData(res.data);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-amber-100 p-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">HRD Grant Calculator</h1>
        <p className="text-foreground-muted mb-6">
          This premium feature calculates your maximum HRD Corp claimable amounts based on the
          Allowable Cost Matrix (ACM). Purchase it on Google Play to unlock.
        </p>

        <div className="bg-background-subtle rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-3">What you get:</h3>
          <ul className="text-sm text-foreground-muted space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Calculate maximum claimable amounts for all cost items
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Covers all training types: In-House, Public, Overseas, E-Learning, ROT
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Auto-applies proration rules, distance rates, and eligibility checks
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Lists required supporting documents per cost item
            </li>
          </ul>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-semibold text-foreground mb-4">Already purchased? Activate here:</h3>

          {/* Manual code entry */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="HRD-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-center tracking-wider"
            />
            <Button onClick={handleActivate} disabled={loading || !code.trim()}>
              {loading ? <Spinner size="sm" /> : 'Activate'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-foreground-muted">OR</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* QR activation */}
          {!showQr ? (
            <Button variant="outline" onClick={handleShowQr} className="w-full">
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code from Mobile App
            </Button>
          ) : (
            <div className="bg-background-subtle rounded-lg p-4">
              <p className="text-sm text-foreground-muted mb-3">
                Open the HRD Grant Calculator app on your phone, tap &quot;Scan to Activate&quot;, and scan this code:
              </p>
              {qrData ? (
                <div className="bg-white rounded-lg p-6 inline-block">
                  {/* QR code placeholder — in production, use a QR library */}
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-mono break-all">{qrData.session_token.slice(0, 16)}...</p>
                  </div>
                </div>
              ) : (
                <Spinner size="md" />
              )}
              <p className="text-xs text-foreground-muted mt-3">QR expires in 5 minutes</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-foreground-muted">
            <Smartphone className="h-4 w-4" />
            <span>Get it on Google Play</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- Calculator Form ----

function CalculatorForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState('');

  const [trainingType, setTrainingType] = useState('in_house');
  const [trainerType, setTrainerType] = useState('internal');
  const [venue, setVenue] = useState('employer_premises');
  const [courseCategory, setCourseCategory] = useState('general');
  const [durationType, setDurationType] = useState('full_day');
  const [customHours, setCustomHours] = useState(1);
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [pax, setPax] = useState(10);
  const [travelDistance, setTravelDistance] = useState('not_applicable');
  const [courseFeeCharged, setCourseFeeCharged] = useState(0);
  const [airTicketCost, setAirTicketCost] = useState(0);
  const [charteredTransport, setCharteredTransport] = useState(0);
  const [consumableMaterials, setConsumableMaterials] = useState(0);
  const [allowanceType, setAllowanceType] = useState<'meal' | 'trainee'>('meal');

  const showCourseFee = courseCategory !== 'general' || trainingType === 'e_learning'
    || trainingType === 'overseas_training' || trainingType === 'overseas_seminar';

  async function handleCalculate() {
    setLoading(true);
    setError('');
    setResult(null);

    const body: any = {
      training_type: trainingType,
      trainer_type: trainerType,
      training_venue: venue,
      course_category: courseCategory,
      duration_type: durationType,
      number_of_days: numberOfDays,
      pax,
      travel_distance: travelDistance,
      allowance_type: allowanceType,
    };
    if (durationType === 'custom_hours') body.custom_hours = customHours;
    if (showCourseFee && courseFeeCharged > 0) body.course_fee_charged = courseFeeCharged;
    if (airTicketCost > 0) body.air_ticket_cost = airTicketCost;
    if (charteredTransport > 0) body.chartered_transport_cost = charteredTransport;
    if (consumableMaterials > 0) body.consumable_materials_cost = consumableMaterials;

    const res = await api.post<CalculatorResult>('/employer/grant-calculator', body);
    setLoading(false);

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.message || 'Calculation failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-full bg-green-100 p-2">
          <Calculator className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">HRD Grant Calculator</h1>
          <p className="text-sm text-foreground-muted">Allowable Cost Matrix (ACM) Calculator</p>
        </div>
        <Badge className="ml-auto bg-green-100 text-green-800">Activated</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h2 className="font-semibold text-foreground mb-4">Training Details</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Training Type</label>
                <Select value={trainingType} onChange={(e) => setTrainingType(e.target.value)}>
                  <option value="in_house">In-House (Face-to-Face)</option>
                  <option value="local_public">Local Public Training</option>
                  <option value="overseas_training">Overseas Training</option>
                  <option value="overseas_seminar">Overseas Seminar</option>
                  <option value="e_learning">E-Learning</option>
                  <option value="remote_online">Remote Online (ROT)</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Trainer Type</label>
                <Select value={trainerType} onChange={(e) => setTrainerType(e.target.value)}>
                  <option value="internal">Internal Trainer</option>
                  <option value="external">External Trainer</option>
                  <option value="overseas">Overseas Trainer</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Venue</label>
                <Select value={venue} onChange={(e) => setVenue(e.target.value)}>
                  <option value="employer_premises">Employer Premises</option>
                  <option value="external_premises">External / Hotel</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Course Category</label>
                <Select value={courseCategory} onChange={(e) => setCourseCategory(e.target.value)}>
                  <option value="general">General Course</option>
                  <option value="focus_area">Focus Area Course</option>
                  <option value="industry_specific">Industry Specific</option>
                  <option value="professional_certification">Professional Certification</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Duration</label>
                <Select value={durationType} onChange={(e) => setDurationType(e.target.value)}>
                  <option value="full_day">Full Day (7 hours)</option>
                  <option value="half_day">Half Day (4 hours)</option>
                  {trainingType === 'e_learning' && <option value="custom_hours">Custom Hours</option>}
                </Select>
              </div>

              {durationType === 'custom_hours' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Hours</label>
                  <Input type="number" min={1} max={7} value={customHours} onChange={(e) => setCustomHours(Number(e.target.value))} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Number of Days</label>
                <Input type="number" min={1} value={numberOfDays} onChange={(e) => setNumberOfDays(Number(e.target.value))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Number of Trainees (Pax)</label>
                <Input type="number" min={1} value={pax} onChange={(e) => setPax(Number(e.target.value))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Travel Distance</label>
                <Select value={travelDistance} onChange={(e) => setTravelDistance(e.target.value)}>
                  <option value="not_applicable">Not Applicable</option>
                  <option value="under_100km">Less than 100km</option>
                  <option value="over_100km">100km or more</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Allowance Type</label>
                <Select value={allowanceType} onChange={(e) => setAllowanceType(e.target.value as 'meal' | 'trainee')}>
                  <option value="meal">Meal Allowance</option>
                  <option value="trainee">Trainee Allowance</option>
                </Select>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-foreground mb-4">Optional Costs (RM)</h2>
            <div className="space-y-3">
              {showCourseFee && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Course Fee Charged (per pax)</label>
                  <Input type="number" min={0} value={courseFeeCharged} onChange={(e) => setCourseFeeCharged(Number(e.target.value))} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Air Ticket (total)</label>
                <Input type="number" min={0} value={airTicketCost} onChange={(e) => setAirTicketCost(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Chartered Transport (total)</label>
                <Input type="number" min={0} value={charteredTransport} onChange={(e) => setCharteredTransport(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Consumable Materials</label>
                <Input type="number" min={0} value={consumableMaterials} onChange={(e) => setConsumableMaterials(Number(e.target.value))} />
              </div>
            </div>
          </Card>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            {loading ? <Spinner size="sm" /> : 'Calculate Grant'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {!result && !loading && (
            <Card className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Calculator className="h-12 w-12 text-foreground-subtle mb-3" />
              <p className="text-foreground-muted">Fill in the training details and click Calculate to see your grant breakdown</p>
            </Card>
          )}

          {loading && (
            <Card className="flex items-center justify-center min-h-[400px]">
              <Spinner size="lg" />
            </Card>
          )}

          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="border-l-4 border-l-green-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">Calculation Result</h2>
                  <div className="text-right">
                    <p className="text-sm text-foreground-muted">Total Claimable</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(result.net_claimable)}</p>
                    {result.financial_assistance_rate < 100 && (
                      <p className="text-xs text-foreground-muted">
                        {result.financial_assistance_rate}% of {formatCurrency(result.total_claimable)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-foreground-muted">Training Type</p>
                    <p className="font-medium text-foreground">{result.input_summary.training_type}</p>
                  </div>
                  <div>
                    <p className="text-foreground-muted">Duration</p>
                    <p className="font-medium text-foreground">{result.input_summary.duration}</p>
                  </div>
                  <div>
                    <p className="text-foreground-muted">Trainees</p>
                    <p className="font-medium text-foreground">{result.input_summary.pax} pax</p>
                  </div>
                  <div>
                    <p className="text-foreground-muted">Assistance Rate</p>
                    <p className="font-medium text-foreground">{result.financial_assistance_rate}%</p>
                  </div>
                </div>
              </Card>

              {/* Cost Items */}
              <Card>
                <h2 className="font-semibold text-foreground mb-4">Cost Item Breakdown</h2>
                <div className="space-y-3">
                  {result.cost_items.map((item) => (
                    <div
                      key={item.item}
                      className={`rounded-lg border p-3 ${
                        item.eligible ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {item.eligible ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border-2 border-gray-300 inline-block" />
                          )}
                          <span className="font-medium text-sm text-foreground">{item.item}</span>
                        </div>
                        {item.eligible && (
                          <span className="font-semibold text-green-700">{formatCurrency(item.max_claimable)}</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted ml-6">{item.reason}</p>
                      {item.eligible && (
                        <>
                          <p className="text-xs text-foreground-muted ml-6 mt-1">Calculation: {item.calculation}</p>
                          {item.required_documents.length > 0 && (
                            <div className="ml-6 mt-2">
                              <p className="text-xs font-medium text-foreground-muted flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Required Documents:
                              </p>
                              <ul className="text-xs text-foreground-muted ml-4 mt-1 space-y-0.5">
                                {item.required_documents.map((doc) => (
                                  <li key={doc}>- {doc}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Notes */}
              {result.notes.length > 0 && (
                <Card>
                  <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Important Notes
                  </h2>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    {result.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">-</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function GrantCalculatorPage() {
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    api.get<EntitlementStatus>('/employer/entitlements?feature=hrd_grant_calculator').then((res) => {
      if (res.success && res.data) {
        setActivated((res.data as EntitlementStatus).active);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!activated) {
    return <ActivationGate onActivated={() => setActivated(true)} />;
  }

  return <CalculatorForm />;
}
