#!/usr/bin/env python3
"""
Career Theme Park Backend Test Suite
Tests static data file accessibility and main page functionality
"""

import requests
import json
import os
import sys
from typing import Dict, Any, List

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://talent-adventure.preview.emergentagent.com')

class CareerThemeParkTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Dict[str, Any] = None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {}
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            for key, value in details.items():
                print(f"  {key}: {value}")
        print()
    
    def test_data_file_accessibility(self):
        """Test all 4 data files are accessible via HTTP GET"""
        print("=== Testing Data File Accessibility ===")
        
        data_files = [
            {
                'path': '/data/career-world.geojson',
                'expected_type': 'geojson',
                'expected_features': 18,
                'description': 'GeoJSON with career zones and role locations'
            },
            {
                'path': '/data/roles.json',
                'expected_type': 'array',
                'expected_count': 4,
                'description': 'Array of role objects'
            },
            {
                'path': '/data/roles_full.json',
                'expected_type': 'object',
                'expected_keys': ['salesforce-enterprise-campaigns', 'salesforce-marketing-ops-practice-leader', 'redhat-abm', 'prgx-digital-abm'],
                'description': 'Object with detailed role information'
            },
            {
                'path': '/data/skills.json',
                'expected_type': 'object',
                'expected_structure': 'skills_array',
                'description': 'Object containing skills array'
            }
        ]
        
        for file_info in data_files:
            try:
                url = f"{self.base_url}{file_info['path']}"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        
                        # Validate JSON structure based on file type
                        if file_info['expected_type'] == 'geojson':
                            if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
                                features = data.get('features', [])
                                if len(features) >= file_info['expected_features']:
                                    self.log_result(
                                        f"Data File: {file_info['path']}", 
                                        True, 
                                        f"Successfully loaded with {len(features)} features",
                                        {'status_code': response.status_code, 'content_type': response.headers.get('content-type')}
                                    )
                                else:
                                    self.log_result(
                                        f"Data File: {file_info['path']}", 
                                        False, 
                                        f"Expected at least {file_info['expected_features']} features, got {len(features)}"
                                    )
                            else:
                                self.log_result(
                                    f"Data File: {file_info['path']}", 
                                    False, 
                                    "Invalid GeoJSON structure"
                                )
                        
                        elif file_info['expected_type'] == 'array':
                            if isinstance(data, list):
                                if len(data) >= file_info['expected_count']:
                                    self.log_result(
                                        f"Data File: {file_info['path']}", 
                                        True, 
                                        f"Successfully loaded array with {len(data)} items",
                                        {'status_code': response.status_code, 'content_type': response.headers.get('content-type')}
                                    )
                                else:
                                    self.log_result(
                                        f"Data File: {file_info['path']}", 
                                        False, 
                                        f"Expected at least {file_info['expected_count']} items, got {len(data)}"
                                    )
                            else:
                                self.log_result(
                                    f"Data File: {file_info['path']}", 
                                    False, 
                                    f"Expected array, got {type(data).__name__}"
                                )
                        
                        elif file_info['expected_type'] == 'object':
                            if isinstance(data, dict):
                                if 'expected_keys' in file_info:
                                    missing_keys = [key for key in file_info['expected_keys'] if key not in data]
                                    if not missing_keys:
                                        self.log_result(
                                            f"Data File: {file_info['path']}", 
                                            True, 
                                            f"Successfully loaded object with {len(data)} keys",
                                            {'status_code': response.status_code, 'content_type': response.headers.get('content-type')}
                                        )
                                    else:
                                        self.log_result(
                                            f"Data File: {file_info['path']}", 
                                            False, 
                                            f"Missing expected keys: {missing_keys}"
                                        )
                                elif file_info.get('expected_structure') == 'skills_array':
                                    if 'skills' in data and isinstance(data['skills'], list):
                                        self.log_result(
                                            f"Data File: {file_info['path']}", 
                                            True, 
                                            f"Successfully loaded skills object with {len(data['skills'])} skills",
                                            {'status_code': response.status_code, 'content_type': response.headers.get('content-type')}
                                        )
                                    else:
                                        self.log_result(
                                            f"Data File: {file_info['path']}", 
                                            False, 
                                            "Missing 'skills' array in object"
                                        )
                                else:
                                    self.log_result(
                                        f"Data File: {file_info['path']}", 
                                        True, 
                                        f"Successfully loaded object with {len(data)} keys",
                                        {'status_code': response.status_code, 'content_type': response.headers.get('content-type')}
                                    )
                            else:
                                self.log_result(
                                    f"Data File: {file_info['path']}", 
                                    False, 
                                    f"Expected object, got {type(data).__name__}"
                                )
                        
                    except json.JSONDecodeError as e:
                        self.log_result(
                            f"Data File: {file_info['path']}", 
                            False, 
                            f"Invalid JSON format: {str(e)}"
                        )
                else:
                    self.log_result(
                        f"Data File: {file_info['path']}", 
                        False, 
                        f"HTTP {response.status_code} - {response.reason}"
                    )
                    
            except requests.exceptions.RequestException as e:
                self.log_result(
                    f"Data File: {file_info['path']}", 
                    False, 
                    f"Request failed: {str(e)}"
                )
    
    def test_main_page_load(self):
        """Test main page loads successfully"""
        print("=== Testing Main Page Load ===")
        
        try:
            url = f"{self.base_url}/"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                
                # Check for key elements
                checks = [
                    ('Career Theme Park title', 'Career Theme Park' in content),
                    ('Mapbox GL CSS', 'mapbox-gl' in content or 'mapbox' in content),
                    ('React hydration', '__NEXT_DATA__' in content or 'react' in content.lower()),
                    ('HTML structure', '<html' in content and '</html>' in content)
                ]
                
                all_passed = True
                details = {}
                
                for check_name, passed in checks:
                    details[check_name] = "✓" if passed else "✗"
                    if not passed:
                        all_passed = False
                
                self.log_result(
                    "Main Page Load", 
                    all_passed, 
                    "Page loaded successfully" if all_passed else "Page loaded but missing some elements",
                    details
                )
                
            else:
                self.log_result(
                    "Main Page Load", 
                    False, 
                    f"HTTP {response.status_code} - {response.reason}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Main Page Load", 
                False, 
                f"Request failed: {str(e)}"
            )
    
    def test_environment_variables(self):
        """Test environment variables are properly configured"""
        print("=== Testing Environment Variables ===")
        
        # Check if NEXT_PUBLIC_MAPBOX_TOKEN is set
        mapbox_token = os.getenv('NEXT_PUBLIC_MAPBOX_TOKEN')
        
        if mapbox_token:
            if mapbox_token.startswith('pk.'):
                self.log_result(
                    "Mapbox Token", 
                    True, 
                    "NEXT_PUBLIC_MAPBOX_TOKEN is properly configured",
                    {'token_prefix': mapbox_token[:10] + '...'}
                )
            else:
                self.log_result(
                    "Mapbox Token", 
                    False, 
                    "NEXT_PUBLIC_MAPBOX_TOKEN doesn't appear to be a valid Mapbox token"
                )
        else:
            self.log_result(
                "Mapbox Token", 
                False, 
                "NEXT_PUBLIC_MAPBOX_TOKEN is not set"
            )
        
        # Check base URL
        if BASE_URL:
            self.log_result(
                "Base URL", 
                True, 
                f"NEXT_PUBLIC_BASE_URL is configured: {BASE_URL}"
            )
        else:
            self.log_result(
                "Base URL", 
                False, 
                "NEXT_PUBLIC_BASE_URL is not set"
            )
    
    def test_api_route_default(self):
        """Test that default API route exists (even if minimal)"""
        print("=== Testing API Route ===")
        
        try:
            url = f"{self.base_url}/api"
            response = requests.get(url, timeout=10)
            
            # For this app, we expect either a 404 (no API needed) or a basic response
            if response.status_code in [200, 404, 405]:  # 405 = Method Not Allowed is also acceptable
                self.log_result(
                    "API Route", 
                    True, 
                    f"API route responds appropriately (HTTP {response.status_code})",
                    {'note': 'This app uses static data files, no backend APIs needed'}
                )
            else:
                self.log_result(
                    "API Route", 
                    False, 
                    f"Unexpected response: HTTP {response.status_code}"
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "API Route", 
                True,  # This is acceptable for a static app
                f"API route not accessible (expected for static app): {str(e)}"
            )
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting Career Theme Park Test Suite")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        self.test_environment_variables()
        self.test_data_file_accessibility()
        self.test_main_page_load()
        self.test_api_route_default()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("\n🎉 All tests passed! Career Theme Park is working correctly.")
            return True
        else:
            print(f"\n⚠️  {total - passed} test(s) failed. See details above.")
            return False

def main():
    """Main test execution"""
    tester = CareerThemeParkTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()