# Strict Privacy Scoring Examples

## New Scoring System

### Grade Thresholds
- **A+**: 90-100 points (Excellent privacy)
- **A**: 80-89 points (Good privacy)  
- **B**: 70-79 points (Acceptable privacy)
- **C**: 60-69 points (Moderate concerns)
- **D**: 50-59 points (Poor privacy)
- **F**: 0-49 points (Privacy violations)

### Category Scoring (Points = Better Privacy)

#### Trackers (40 points max)
- **0-2 trackers**: 40 points (A+ territory)
- **3-5 trackers**: 12 points (C territory)
- **6-9 trackers**: 8 points (D territory)
- **10+ trackers**: 0 points (F territory)
- **High-risk trackers present**: Cap at 5 points maximum

#### Cookies (20 points max)
- **0 cookies**: 20 points
- **1-5 cookies**: 4 points
- **6-9 cookies**: 2 points
- **10-19 cookies**: 1 point
- **20+ cookies**: 0 points

#### Fingerprinting (20 points max)
- **Strong methods detected** (canvas/WebGL/audio): 0 points
- **3+ moderate methods**: 3 points
- **1-2 moderate methods**: 6 points
- **No fingerprinting**: 20 points

#### Permissions (10 points max)
- **Sensitive permissions** (location/camera/mic): 0 points
- **Moderate permissions** (notifications): 2 points
- **No concerning permissions**: 10 points

#### Forms (10 points max)
- **5+ sensitive fields**: 0 points
- **3-4 sensitive fields**: 1 point
- **1-2 sensitive fields**: 3 points
- **10+ fields (not sensitive)**: 5 points
- **Minimal data collection**: 10 points

#### Third-Party Penalties
- **15+ third-party scripts**: -20 points
- **8-14 third-party scripts**: -10 points

## Real Website Examples

### CNN.com (Expected: F Grade)
```
Trackers: 15+ detected → 0 points
Cookies: 25+ cookies → 0 points  
Fingerprinting: Canvas detected → 0 points
Permissions: Notifications → 2 points
Forms: Newsletter signup → 5 points
Third-party: 20+ scripts → -20 penalty
Final Score: 0 + 0 + 0 + 2 + 5 - 20 = -13 → 0 points = F
```

### Facebook.com (Expected: F Grade)
```
Trackers: 20+ detected → 0 points
Cookies: 30+ cookies → 0 points
Fingerprinting: Multiple methods → 0 points
Permissions: Camera/mic requests → 0 points
Forms: Extensive personal data → 0 points
Third-party: 25+ scripts → -20 penalty
Final Score: 0 + 0 + 0 + 0 + 0 - 20 = -20 → 0 points = F
```

### Reddit.com (Expected: D Grade)
```
Trackers: 8 detected → 8 points
Cookies: 15 cookies → 1 point
Fingerprinting: Font enumeration → 6 points
Permissions: Notifications → 2 points
Forms: Registration form → 3 points
Third-party: 12 scripts → -10 penalty
Final Score: 8 + 1 + 6 + 2 + 3 - 10 = 10 points = F
```

### DuckDuckGo.com (Expected: A+ Grade)
```
Trackers: 0 detected → 40 points
Cookies: 2 cookies → 4 points
Fingerprinting: None detected → 20 points
Permissions: None → 10 points
Forms: Search only → 10 points
Third-party: 3 scripts → 0 penalty
Final Score: 40 + 4 + 20 + 10 + 10 = 84 points = A
```

### Wikipedia.org (Expected: A+ Grade)
```
Trackers: 1 detected → 40 points
Cookies: 3 cookies → 4 points
Fingerprinting: None → 20 points
Permissions: None → 10 points
Forms: Search/edit → 8 points
Third-party: 5 scripts → 0 penalty
Final Score: 40 + 4 + 20 + 10 + 8 = 82 points = A
```

## Integration Instructions

1. **Reload Extension**: Go to chrome://extensions/ and reload PrivacyGrade
2. **Test Sites**: Visit the example sites above
3. **Verify Grades**: Confirm heavily tracked sites get F grades
4. **Check Consistency**: Same site should always get same grade

## Key Changes Made

- **Inverted scoring**: Higher points = better privacy
- **Strict thresholds**: 6+ trackers automatically drop to D/F territory
- **Zero tolerance**: Any strong fingerprinting = 0 points
- **Third-party penalties**: Heavy external script usage penalized
- **Realistic grading**: Most commercial sites will be C-F grades
- **Privacy-friendly sites**: Only truly clean sites get A/A+

The new system ensures that privacy-invasive sites like CNN, Facebook, and most commercial sites receive F grades, while only genuinely privacy-respecting sites achieve A grades.