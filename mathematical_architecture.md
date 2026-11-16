# Balloon Plop Plop — Mathematical Architecture Document

This document details the mathematical theory, algorithmic design, and underlying physical principles of the **Balloon Plop Plop** game engine. It serves as an educational bridge mapping web application logic to computer science, kinematic physics, digital signal processing (DSP), and mechatronics/hardware engineering.

---

## 1. Spawning & Distribution (Algebra & Probability)

### 1.1 Concept: Time Bucket Distribution & The Last Balloon Catch

In video games and real-time embedded systems, generating $n$ events across a time duration $T_{total}$ using naive independent random interval generation (such as Poisson point processes or uniform `Math.random()` timeouts) often leads to **event clustering** (bursts of events followed by long silent gaps) or **time overruns** (events spawning too late for the user to interact with them).

To guarantee fair, consistent gameplay regardless of extreme user parameters (e.g., $T = 300\text{s}$ with $n = 5$ balloons, or $T = 10\text{s}$ with $n = 100$ balloons), the system uses a **Time Bucket Distribution Algorithm**.

#### The Last Balloon Catch Problem
A balloon spawned at position $y = 0$ requires a finite time $T_{fall}$ to travel to the ground $y = H_{screen}$. If a balloon spawns at time $t = T_{total} - 0.5\text{s}$, the game timer will expire before the balloon even reaches the middle of the screen.

Therefore, the active **Spawning Phase** $T_{spawnPhase}$ must conclude before $T_{total}$:

$$
T_{spawnPhase} = T_{total} - T_{buffer}
$$

```text
Game Timeline [0 ---------------------------------------------------- T_total]
Spawning Phase [0 ------------------------- T_spawnPhase]
Fall Buffer Phase                            [T_buffer -------------- T_total]
                                             (Last balloon falls & hits ground)
```

---

### 1.2 Mathematical Formulation

#### 1. Estimated Fall Time & Buffer Phase
Let $H$ be the screen height in pixels, and $v_{avg}$ be the average downward velocity in pixels per second:

$$
v_{avg} = v_{basePxPerFrame} \times 60 \times m_{speed}
$$

Where $v_{basePxPerFrame} \approx 2.25\text{ px/frame}$ and $m_{speed}$ is the user-selected speed multiplier ($0.7, 1.0, 1.4, 1.8$).

The estimated fall duration $T_{fall}$ is:

$$
T_{fall} = \frac{H}{v_{avg}}
$$

The buffer time $T_{buffer}$ is clamped to ensure it never consumes more than $70\%$ of short game rounds nor drops below $3.5$ seconds:

$$
T_{buffer} = \min\left(0.70 \times T_{total}, \; \max(3.5, \; T_{fall})\right)
$$

$$
T_{spawnPhase} = \max\left(0.5, \; T_{total} - T_{buffer}\right)
$$

#### 2. Equal Time Bucket Sizing
The total spawning phase $T_{spawnPhase}$ is partitioned into $n$ disjoint, equal-width contiguous intervals (time buckets) $B_0, B_1, \dots, B_{n-1}$:

$$
B = \frac{T_{spawnPhase}}{n}
$$

Each bucket $i \in \{0, 1, \dots, n-1\}$ spans the time domain:

$$
\text{Domain}(B_i) = [i \cdot B, \; (i + 1) \cdot B)
$$

#### 3. Continuous Random Interval Generation
To achieve continuous randomness without clustering, exactly one spawn timestamp $t_i$ is sampled from a continuous uniform probability distribution $U(a, b)$ within bucket $i$:

$$
t_i \sim U\left(i \cdot B, \; (i + 1) \cdot B\right)
$$

$$
t_i = i \cdot B + R_i \cdot B \quad \text{where } R_i \sim U(0, 1)
$$

---

### 1.3 Code Implementation

```typescript
// From src/App.tsx
const prepareBalloonSchedule = useCallback((totalN: number, durationSec: number, speedMultiplier: number) => {
  const list: BalloonItem[] = [];

  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const avgSpeedPxPerSec = 135 * speedMultiplier;
  const estimatedFallDuration = windowHeight / avgSpeedPxPerSec;

  // Last Balloon Catch equation
  const fallBuffer = Math.min(durationSec * 0.7, Math.max(3.5, estimatedFallDuration));
  const spawnPhaseDuration = Math.max(0.5, durationSec - fallBuffer);

  // Bucket size calculation
  const bucketSize = spawnPhaseDuration / totalN;

  for (let i = 0; i < totalN; i++) {
    const bucketStart = i * bucketSize;
    // Uniform sampling within bucket i
    const spawnTime = bucketStart + Math.random() * bucketSize;

    list.push({
      id: `balloon-${i}`,
      spawnTime,
      // ...
    });
  }

  return list.sort((a, b) => a.spawnTime - b.spawnTime);
}, []);
```

---

## 2. Game Physics (Kinematics)

### 2.1 Concept: Discrete Euler Integration & Delta Time

In computer graphics, physics simulation relies on numerically integrating differential equations of motion over discrete time steps $\Delta t$.

If movement is updated blindly per frame without factoring in frame-render variations ($\Delta t$), a player running at 144Hz monitors will experience game physics running $2.4\times$ faster than a player on a 60Hz display.

The game uses **Discrete Euler Integration with Delta Time Scaling**:

$$
\vec{r}(t + \Delta t) = \vec{r}(t) + \vec{v}(t) \cdot \Delta t
$$

---

### 2.2 Mathematical Formulation

#### 1. Vertical Downward Displacement
Let $y(t)$ represent vertical displacement in pixels, $y_0 = -100\text{px}$ (above the top screen edge), and $v_{eff}$ be effective velocity in pixels/second:

$$
v_{eff} = v_{base} \times m_{speed} \times 60
$$

In discrete time step $k$ with elapsed time $\Delta t_k = t_k - t_{k-1}$ (seconds):

$$
y_{k} = y_{k-1} + v_{eff} \cdot \Delta t_k
$$

Integrating over total elapsed time $t$:

$$
y(t) = y_0 + \int_{0}^{t} v_{eff} \, d\tau = y_0 + v_{eff} \cdot t
$$

#### 2. Horizontal Wind Sway (Harmonic Motion)
To simulate natural atmospheric sway, an orthogonal horizontal displacement $x_{sway}(y)$ is modulated as a function of vertical displacement $y$:

$$
x(y) = x_0 + A_{sway} \cdot \sin\left(\omega_y \cdot y + \phi_0\right)
$$

Where:
- $x_0$: Initial horizontal screen coordinate ($8\% \le x_0 \le 92\%$).
- $A_{sway}$: Sway amplitude ($15\text{px} \le A_{sway} \le 35\text{px}$).
- $\omega_y$: Angular spatial frequency ($\approx 0.05\text{ rad/px}$).
- $\phi_0$: Initial phase offset sampled randomly from $U(0, 2\pi)$.

---

### 2.3 Code Implementation

```typescript
// From src/App.tsx tick loop
const tick = (now: number) => {
  const deltaSec = (now - lastTimestamp) / 1000; // Delta time in seconds
  lastTimestamp = now;

  setBalloons((prev) =>
    prev.map((balloon) => {
      // Euler Integration: y_new = y_old + velocity * deltaSec * 60
      const newY = balloon.y + balloon.speed * config.fallingSpeedMultiplier * (deltaSec * 60);
      return { ...balloon, y: newY };
    })
  );
};
```

---

## 3. Scoring System (Weighted Probability)

### 3.1 Concept: Inverse Probability Density & Risk-Reward Balance

To create engaging game dynamics, higher point rewards must be rarer and physically harder to acquire.

The scoring system assigns discrete balloon values $X \in \{20, 40, 100\}$ based on a **Probability Mass Function (PMF)** $P(X = k)$:

| Balloon Value ($k$) | Type | Radius ($r$) | Appearance Probability $P(X=k)$ | Difficulty |
| :--- | :--- | :--- | :--- | :--- |
| **20 Points** | Standard | $55\text{px}$ | $60\%$ ($0.60$) | Low (Large target) |
| **40 Points** | Medium | $46\text{px}$ | $30\%$ ($0.30$) | Medium |
| **100 Points** | Special Gold | $38\text{px}$ | $10\%$ ($0.10$) | High (Small & fast) |

---

### 3.2 Mathematical Formulation

#### 1. Cumulative Distribution Function (CDF) Inversion Method
Random balloon value selection generates a uniform random number $R \sim U(0, 1)$ and evaluates it against the partition boundaries of the Cumulative Distribution Function $F(x) = P(X \le x)$:

$$
X(R) = \begin{cases} 
20 & \text{if } 0 \le R \le 0.60 \\ 
40 & \text{if } 0.60 < R \le 0.90 \\ 
100 & \text{if } 0.90 < R \le 1.00 
\end{cases}
$$

```text
[0.0 ------------------------ 0.60 ----------------- 0.90 ------- 1.00]
|        20 Points (60%)        |   40 Points (30%)   |  100 Pt (10%) |
```

#### 2. Expected Value $E[X]$ per Balloon
The statistical expectation (mean point value per spawned balloon) is:

$$
E[X] = \sum_{k} k \cdot P(X = k)
$$

$$
E[X] = (20 \times 0.60) + (40 \times 0.30) + (100 \times 0.10)
$$

$$
E[X] = 12 + 12 + 10 = 34 \text{ points per balloon}
$$

For a round with parameter $n$ balloons, the maximum theoretical score $S_{max}$ and average expected score $S_{exp}$ are:

$$
S_{max} = 100 \cdot n
$$

$$
S_{exp} = E[X] \cdot n = 34 \cdot n
$$

---

### 3.3 Code Implementation

```typescript
// From src/App.tsx
const rand = Math.random(); // Uniform distribution U(0,1)
let value: BalloonValue = 20;
let size = 55;

if (rand > 0.9) {
  value = 100; // P(X=100) = 1.00 - 0.90 = 0.10
  size = 38;
} else if (rand > 0.6) {
  value = 40;  // P(X=40)  = 0.90 - 0.60 = 0.30
  size = 46;
} else {
  value = 20;  // P(X=20)  = 0.60 - 0.00 = 0.60
  size = 55;
}
```

---

## 4. Web Audio Synthesis (Signal Processing)

### 4.1 Concept: FM Chirp & Exponential ADSR Envelopes

Rather than loading pre-recorded `.mp3` audio files, sound is synthesized in real-time using the **Web Audio API**.

The "plop/blow-up" sound consists of two simultaneous acoustic components:
1. **Pitch Chirp (FM Frequency Modulation Sweep):** Rapid downward frequency shift mimicking compressed air escaping a bursting rubber membrane.
2. **Filtered White Noise Burst:** High-frequency acoustic pressure snap.

---

### 4.2 Mathematical Formulation

#### 1. Downward Frequency Chirp (Exponential Pitch Modulation)
The carrier oscillator frequency $f(t)$ decays exponentially from initial frequency $f_{start}$ to target frequency $f_{end}$ over duration $\Delta t_{sweep}$:

$$
f(t) = f_{start} \cdot \left(\frac{f_{end}}{f_{start}}\right)^{\frac{t - t_0}{\Delta t_{sweep}}}
$$

In continuous time, the instantaneous phase $\Phi(t)$ of the sine wave oscillator is the integral of frequency:

$$
\Phi(t) = 2\pi \int_{t_0}^{t} f(\tau) \, d\tau
$$

$$
s_{osc}(t) = A(t) \cdot \sin\left(\Phi(t)\right)
$$

Where $f_{start} = 420\text{Hz}$ (for $20\text{pt}$), $550\text{Hz}$ (for $40\text{pt}$), or $700\text{Hz}$ (for $100\text{pt}$), dropping to $f_{end} \approx 60\text{Hz}$ over $\Delta t_{sweep} = 0.08\text{s}$.

#### 2. Exponential Gain Decay Envelope (ADSR)
The amplitude envelope $A(t)$ follows an exponential attenuation model:

$$
A(t) = A_0 \cdot e^{-\lambda (t - t_0)}
$$

Where decay rate $\lambda$ is defined by target attenuation at time $t_0 + \Delta t_{decay}$:

$$
\lambda = \frac{\ln(A_0 / A_{min})}{\Delta t_{decay}}
$$

#### 3. White Noise Synthesis (Uniform Pseudo-Random Signal)
White noise $n(t)$ is generated by sampling independent uniform random values in $[-1, 1]$:

$$
n(t) \sim U(-1, 1)
$$

It is passed through a Biquad Bandpass Filter with center frequency $f_c = 1200\text{Hz}$ and quality factor $Q = 1.5$:

$$
H(s) = \frac{\frac{\omega_0}{Q} s}{s^2 + \frac{\omega_0}{Q} s + \omega_0^2} \quad \text{where } \omega_0 = 2\pi f_c
$$

---

### 4.3 Code Implementation

```typescript
// From src/utils/audio.ts
public playPop(value: 20 | 40 | 100 = 20) {
  const now = this.ctx.currentTime;
  const baseFreq = value === 100 ? 700 : value === 40 ? 550 : 420;
  const endFreq = value === 100 ? 120 : value === 40 ? 90 : 60;

  // 1. Exponential Pitch Sweep Oscillator
  const osc = this.ctx.createOscillator();
  const gain = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

  // 2. Exponential Gain Decay Envelope
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(this.ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
```

---

## 5. Edge Cases & UI Math

### 5.1 Concept: Clamping Functions & Discrete Display Ceiling

When user-configurable numeric inputs are exposed, robust boundary constraints are required to prevent arithmetic division-by-zero ($\frac{x}{0} \to \infty$), stack overflows, or unresponsive UI state.

---

### 5.2 Mathematical Formulation

#### 1. Algebraic Clamping Function
The clamping function $\text{clamp}(x, x_{min}, x_{max})$ bounds any scalar $x \in \mathbb{R}$:

$$
\text{clamp}(x, x_{min}, x_{max}) = \max\left(x_{min}, \; \min(x_{max}, x)\right)
$$

For game parameters:
- **Timer Limit:** $x_{timer} \in [5, 300]\text{ seconds}$.
- **Balloon Count ($n$):** $x_{n} \in [1, 500]\text{ balloons}$.

$$
\text{timerLimit}_{valid} = \max\left(5, \; \min(300, \lfloor x_{user} \rfloor)\right)
$$

$$
\text{totalBalloons}_{valid} = \max\left(1, \; \min(500, \lfloor x_{user} \rfloor)\right)
$$

#### 2. Countdown Timer Ceiling Function
To ensure the display shows $30\text{s}$ at $t=0.01\text{s}$ and transitions smoothly down to $0\text{s}$, the time remaining uses the mathematical ceiling function $\lceil x \rceil$:

$$
T_{remaining}(t) = \max\left(0, \; \left\lceil T_{limit} - t \right\rceil\right)
$$

Where $\lceil x \rceil = \min \{ n \in \mathbb{Z} \mid n \ge x \}$.

---

### 5.3 Code Implementation

```typescript
// Clamping implementation in ControlPanel.tsx
const handleTimerBlur = () => {
  const parsed = parseInt(timerInput, 10);
  if (isNaN(parsed) || parsed < MIN_TIMER) {
    setTimerInput(MIN_TIMER.toString());
    onUpdateConfig({ timerLimit: MIN_TIMER });
  } else if (parsed > MAX_TIMER) {
    setTimerInput(MAX_TIMER.toString());
    onUpdateConfig({ timerLimit: MAX_TIMER });
  }
};

// Ceiling remaining timer calculation in App.tsx
const remaining = Math.max(0, Math.ceil(config.timerLimit - currentTime));
```

---

## 6. Bridge to Physical-World Mechatronics & Hardware

Understanding how pure software math translates to physical systems is fundamental for robotics, mechatronics, and embedded engineering. Below is the direct mapping between concepts in this game and real-world hardware design:

| Software Game Concept | Mechatronics & Hardware Equivalent |
| :--- | :--- |
| **Time Bucket Distribution** | Real-Time Task Scheduler (FreeRTOS / RTOS Task Slots) |
| **Discrete Euler Delta Time ($\Delta t$)** | PID Motor Control Loop (Encoder Sampling Feedback) |
| **Exponential Audio Frequency Sweep** | Stepper Motor Acceleration Profile (S-Curve Velocity) |
| **Exponential ADSR Decay Envelope** | Pulse Width Modulation (PWM) Duty Decay & Solenoid Control |
| **CDF Thresholding (20/40/100 pts)** | Sensor Noise Thresholding & Classification Logic |
| **Clamping Functions $[x_{min}, x_{max}]$** | Hardware Safety Cut-offs, Soft Limits & Current Limiters |

### 1. Time Bucket Distribution $\to$ Real-Time Embedded Schedulers (RTOS)
In robotics (e.g., automated assembly lines or drone flight controllers), multiple sensor readings or motor pulses must occur within fixed time frames without starving other tasks. 
- In **FreeRTOS** or **Rate Monotonic Scheduling (RMS)**, time slot bucketing prevents CPU starvation. Instead of checking sensors using arbitrary delays (blocking `delay()`), periodic interrupts (Hardware Timers / CTC mode in AVR/STM32) trigger actions within dedicated deterministic time slots.

### 2. Kinematic Euler Integration $\to$ Stepper & DC Motor PID Control
In CNC machines, 3D printers, and electric vehicles, calculating position from velocity $y_{new} = y_{old} + v \cdot \Delta t$ is identical to **Encoder Odometry**:

$$
\theta(t + \Delta t) = \theta(t) + \omega(t) \cdot \Delta t
$$

Where $\theta$ is shaft angle, $\omega$ is angular velocity from an optical encoder, and $\Delta t$ is the microsecond sampling interrupt period of the microcontroller.

### 3. Frequency Sweep & ADSR Envelopes $\to$ Stepper Motor Soft-Start Ramps & PWM
Attempting to drive a physical motor from $0\text{ RPM}$ to $3000\text{ RPM}$ instantaneously causes rotor stall due to rotational inertia ($J$). 
- The exponential frequency sweep equation $f(t) = f_{start} e^{k t}$ used for the pop sound is mathematically identical to **S-Curve / Exponential Velocity Profiling** in motor drivers (e.g., TMC2209 stepper drivers).
- The exponential gain decay envelope $A(t) = A_0 e^{-\lambda t}$ maps directly to **Pulse Width Modulation (PWM)** duty-cycle decay for controlling electromagnetic solenoids, piezo actuators, or LED brightness.

### 4. CDF Weighted Probability $\to$ Industrial Quality Control & Sorting Systems
In automated sorting machinery (e.g., optical fruit sorters or coin counters), sensor measurements (color, weight, size) map continuous analog inputs into discrete classification categories using thresholding logic identical to our CDF probability function:

$$
\text{Class} = \begin{cases} 
\text{Standard Grade} & \text{if } V_{sensor} \le V_{ref1} \\ 
\text{Premium Grade} & \text{if } V_{ref1} < V_{sensor} \le V_{ref2} \\ 
\text{Reject} & \text{if } V_{sensor} > V_{ref2} 
\end{cases}
$$

---

## 7. Summary Architectural Diagram

```text
+-------------------------------------------------------------------------+
|                       USER CONFIGURATION INPUTS                         |
|   Timer Limit (T: 5s-300s) | Balloon Count (n: 1-500) | Speed Multiplier |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  TIME BUCKET SPAWNING ENGINE                            |
| 1. Fall Buffer:   T_buffer = min(0.70 * T, max(3.5s, T_fall))           |
| 2. Spawn Phase:   T_spawn = T - T_buffer                                |
| 3. Bucket Size:   B = T_spawn / n                                       |
| 4. Uniform Sampling: t_i ~ U( i*B, (i+1)*B )                            |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  KINEMATIC PHYSICS ENGINE (60 FPS)                      |
| 1. Euler Integration:  y_k = y_{k-1} + v_eff * dt * 60                  |
| 2. Harmonic Sway:      x_k = x_0 + A * sin( w*y + phi )                 |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  WEB AUDIO DSP SIGNAL PROCESSING                        |
| 1. Exponential Chirp:  f(t) = f_start * (f_end/f_start)^(t / dt)        |
| 2. Exponential Decay:  A(t) = A_0 * e^(-lambda * t)                     |
+-------------------------------------------------------------------------+
```

---
*Documented for the Balloon Plop Plop Engine — Architectural Codebase Audit.*
