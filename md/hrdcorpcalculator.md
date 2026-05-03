Allowable Cost Matrix Calculator Specification

Version: Based on HRD Corp ACM August 2025

1. Input Parameters

The calculator must collect the following inputs:

1.1 Training Type

In-House (Face-to-Face)

Local Public Training / Seminar / Conference

Overseas Training

Overseas Seminar / Conference

E-Learning

Remote Online Training (ROT)

1.2 Trainer Type

Internal Trainer

External Trainer

Overseas Trainer

1.3 Training Venue

Employer Premises

External Training Premises or Hotel

1.4 Course Category

General Course

Focus Area Course

Industry Specific Course

Professional Certification Course

1.5 Duration

Full Day (7 hours)

Half Day (4 hours)

Custom Hours (for E-learning only)

1.6 Number of Trainees (Pax)
1.7 Travel Distance (if applicable)

< 100km

≥ 100km

2. Core Logic Structure (In-House Face-to-Face)

The matrix must be evaluated in this order:

Determine Training Venue

Determine Trainer Type

Determine Eligibility per Cost Item

3. Cost Items and Rules
A. Internal Trainer Allowance
Eligibility:

Only applicable when:

Trainer Type = Internal Trainer

Training Type = In-House (Face-to-Face)

Venue = Employer Premises OR External Training Premises

Amount:

RM1,400 per day per group (Full Day)

RM800 per half day per group (Half Day)

Prorated if < 5 pax

B. Course Fee (In-House)
General Course:

Note: for calculation purpose on the course fee. Use RM10,000 for any "as per charge" item 

RM10,500 per day per group

RM6,000 per half day per group

Prorated if < 5 pax

Focus Area:

As charged

Quoted per pax

Prorated based on attendance

Industry Specific:

As charged

Per pax

Prorated based on attendance

Professional Certification:

As charged

Per pax

Prorated based on attendance

C. Allowance for Trainees / Trainers

Applicable for:

Internal trainers from HQ/branches

External trainers

Overseas trainers

Distance rule:

<100km → RM250 per day per pax

≥100km → RM500 per day per pax
Minimum 4 hours required

D. Meal Allowance

Applicable to:

Trainees

Internal trainers

Amount:

RM100 per day per pax
Minimum 4 hours

Note:
Only ONE type of allowance allowed (Meal OR Trainee).

E. Overseas Trainer Daily Allowance

Applicable only when:

Trainer Type = Overseas Trainer

Amount:

RM500 per day per pax

F. Air Ticket

Applicable to:

Trainees

Internal trainers from branches

External trainers

Overseas trainers

Amount:

Actual airfare cost

G. Chartered Transportation

As per quotation

H. Consumable Training Materials

RM100 per group without quotation

If > RM100 → Itemised invoice required

4. E-Learning Rules

If Training Type = E-Learning:

Maximum Financial Assistance:

Hours	Assistance
1	RM125/pax
2	RM250/pax
3	RM375/pax
4	RM500/pax
5	RM625/pax
6	RM750/pax
7	RM875/pax

Rule:

Minimum 1 hour

Max 7 hours per calculation block

7 hours → additional half-day/full-day logic applies

5. Overseas Training

If Training Type = Overseas Training:

Course Fee

As charged (convert to RM)

Daily Allowance

RM1,500 per day per pax

Up to 2 extra days allowed

Air Ticket

Actual airfare

Subject to 50% financial assistance rate.

6. Validation Rules

Attendance must be ≥75%.

Minimum 4 hours for daily allowances.

If only 4 hours → half day rate applies.

External trainers can only claim Trainer Allowance.

Only one allowance type selectable (Meal OR Trainee).

7. Output Structure

The calculator must output:

Eligible Cost Items

Maximum Claimable Amount per Item

Total Claimable Amount

Required Supporting Documents per item