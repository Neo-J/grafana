// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     LatestMajorsOrXJenny
//     PluginEachMajorJenny
//
// Run 'make gen-cue' from repository root to regenerate.

import * as common from '@grafana/schema';

export interface Options extends common.OptionsWithTimezones {
  legend: common.VizLegendOptions;
  tooltip: common.VizTooltipOptions;
}

export interface FieldConfig extends common.GraphFieldConfig {}
