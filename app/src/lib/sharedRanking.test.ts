import { describe, it, expect } from 'vitest'
import { rankProblemJoints, topProblemAreasForAssessment, jointKeyBase } from './mobilityBands'

// Reid beta1 fixture (af305114...), read-only copy of the Oct 19 assessment.
const beta1 = {
  hip_er_l: 36, hip_er_r: 36, hip_ir_l: 33, hip_ir_r: 33, hip_abd_l: 50, hip_abd_r: 50,
  hip_flex_l: 70, hip_flex_r: 70, shoulder_er_l: 85, shoulder_er_r: 85,
  shoulder_flex_l: 160, shoulder_flex_r: 160, ankle_df_l: 11, ankle_df_r: 12,
  cervical_lat_l: 40, cervical_lat_r: 40, cervical_flex: 50, cervical_ext: 50,
  worst_joints: ['cervical_ext', 'hip_er_l', 'hip_er_r', 'hip_ir_l', 'hip_ir_r'],
}

describe('shared top-3 (My Body == My Protocol)', () => {
  it('beta1: Cervical Ext, Hip ER, Hip IR on both screens', () => {
    const body = topProblemAreasForAssessment(beta1).map(jointKeyBase)
    const rows = ['hip_er', 'hip_ir', 'hip_abd', 'hip_flex', 'shoulder_er', 'shoulder_flex', 'ankle_df', 'cervical_lat', 'cervical_flex', 'cervical_ext']
      .map(key => ({ key, asymmetry: key === 'ankle_df' ? 1 : 0, severity: 0 }))
    const protocol = rankProblemJoints(beta1, rows).map(r => r.key)
    expect(body).toEqual(['cervical_ext', 'hip_er', 'hip_ir'])
    expect(protocol).toEqual(body)
  })
})
