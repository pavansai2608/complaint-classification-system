import unittest

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class HealthTests(unittest.TestCase):
    def test_health_returns_ok(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_unknown_route_returns_404(self):
        response = client.get("/does-not-exist")
        self.assertEqual(response.status_code, 404)

    def test_docs_are_off_by_default(self):
        self.assertEqual(client.get("/docs").status_code, 404)
        self.assertEqual(client.get("/openapi.json").status_code, 404)

    def test_no_cors_header_for_browser_origins(self):
        # Only the Express server should call this service, never a browser
        response = client.get("/health", headers={"Origin": "http://evil.example.com"})
        self.assertNotIn("access-control-allow-origin", response.headers)

    def test_spec_lists_both_routes_and_the_service_key(self):
        spec = app.openapi()
        self.assertEqual(set(spec["paths"]), {"/health", "/analyze"})
        self.assertEqual(
            spec["components"]["securitySchemes"]["ServiceKey"],
            {"type": "apiKey", "in": "header", "name": "X-Service-Key"},
        )
        self.assertEqual(spec["paths"]["/analyze"]["post"]["security"], [{"ServiceKey": []}])
        self.assertNotIn("security", spec["paths"]["/health"]["get"])


if __name__ == "__main__":
    unittest.main()
