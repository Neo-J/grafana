// THIS FILE IS GENERATED. EDITING IS FUTILE.
//
// Generated by:
//     kinds/gen.go
// Using jennies:
//     GoTypesJenny
//     LatestJenny
//
// Run 'make gen-cue' from repository root to regenerate.

package service

// Defines values for EndpointType.
const (
	EndpointTypeDns EndpointType = "dns"

	EndpointTypeHttp EndpointType = "http"

	EndpointTypePing EndpointType = "ping"

	EndpointTypeTcp EndpointType = "tcp"
)

// Service defines model for service.
type Service struct {
	Endpoints *[]Endpoint `json:"endpoints,omitempty"`

	// hack this in body b/c kindsys doesn't support meta yet.
	// codegen here is buggy - value type IS always a string, you can safely assert that in your code
	Labels map[string]interface{} `json:"labels"`

	// name of the service
	Name string `json:"name"`
	Uid  string `json:"uid"`
}

// Endpoint defines model for service.Endpoint.
type Endpoint struct {
	Path string       `json:"path"`
	Type EndpointType `json:"type"`
}

// EndpointType defines model for Endpoint.Type.
type EndpointType string
