/**
 * Test utilities for creating mock objects
 */

/**
 * Creates a mock Response object with all required properties
 */
export function createMockResponse(data: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = ok ? 200 : 400 } = options;

  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: new Headers(),
    redirected: false,
    type: 'default' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: function () {
      return createMockResponse(data, { ok, status });
    },
  } as Response;
}

