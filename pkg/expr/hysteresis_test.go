package expr

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/expr/mathexp"
	"github.com/grafana/grafana/pkg/infra/tracing"
)

func TestHysteresisExecute(t *testing.T) {
	number := func(label string, value float64) mathexp.Number {
		n := mathexp.NewNumber("A", data.Labels{"label": label})
		n.SetValue(&value)
		return n
	}
	fingerprint := func(label string) data.Fingerprint {
		return data.Labels{"label": label}.Fingerprint()
	}

	tracer := tracing.InitializeTracerForTest()

	var loadThreshold = 100.0
	var unloadThreshold = 30.0

	readerErr := errors.New("test")

	testCases := []struct {
		name                string
		loadedMetricsReader fakeLoadedMetricsReader
		input               mathexp.Values
		expected            mathexp.Values
		expectedError       error
	}{
		{
			name:                "return NoData when no data",
			loadedMetricsReader: fakeLoadedMetricsReader{},
			input:               mathexp.Values{mathexp.NewNoData()},
			expected:            mathexp.Values{mathexp.NewNoData()},
		},
		{
			name:                "error if reader returns error",
			loadedMetricsReader: fakeLoadedMetricsReader{err: readerErr},
			input:               mathexp.Values{number("value1", 100)},
			expectedError:       readerErr,
		},
		{
			name:                "use only loaded condition if no loaded metrics",
			loadedMetricsReader: fakeLoadedMetricsReader{},
			input: mathexp.Values{
				number("value1", loadThreshold+1),
				number("value2", loadThreshold),
				number("value3", loadThreshold-1),
				number("value4", unloadThreshold+1),
				number("value5", unloadThreshold),
				number("value6", unloadThreshold-1),
			},
			expected: mathexp.Values{
				number("value1", 1),
				number("value2", 0),
				number("value3", 0),
				number("value4", 0),
				number("value5", 0),
				number("value6", 0),
			},
		},
		{
			name: "evaluate loaded metrics against unloaded threshold",
			loadedMetricsReader: fakeLoadedMetricsReader{
				loaded: map[data.Fingerprint]struct{}{
					fingerprint("value4"): {},
					fingerprint("value5"): {},
					fingerprint("value6"): {},
				},
			},
			input: mathexp.Values{
				number("value1", loadThreshold+1),
				number("value2", loadThreshold),
				number("value3", loadThreshold-1),
				number("value4", unloadThreshold+1),
				number("value5", unloadThreshold),
				number("value6", unloadThreshold-1),
			},
			expected: mathexp.Values{
				number("value1", 1),
				number("value2", 0),
				number("value3", 0),
				number("value4", 1),
				number("value5", 0),
				number("value6", 0),
			},
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cmd := &HysteresisCommand{
				RefID:        "B",
				ReferenceVar: "A",
				LoadingThresholdFunc: ThresholdCommand{
					ReferenceVar:  "A",
					RefID:         "B",
					ThresholdFunc: ThresholdIsAbove,
					Conditions:    []float64{loadThreshold},
				},
				UnloadingThresholdFunc: ThresholdCommand{
					ReferenceVar:  "A",
					RefID:         "B",
					ThresholdFunc: ThresholdIsAbove,
					Conditions:    []float64{unloadThreshold},
				},
				LoadedReader: tc.loadedMetricsReader,
			}

			result, err := cmd.Execute(context.Background(), time.Now(), mathexp.Vars{
				"A": mathexp.Results{Values: tc.input},
			}, tracer)
			if tc.expectedError != nil {
				require.ErrorIs(t, err, tc.expectedError)
				return
			}
			require.NoError(t, err)
			require.EqualValues(t, result.Values, tc.expected)
		})
	}
}

type fakeLoadedMetricsReader struct {
	loaded map[data.Fingerprint]struct{}
	err    error
}

func (f fakeLoadedMetricsReader) Read(_ context.Context) (map[data.Fingerprint]struct{}, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.loaded, nil
}
