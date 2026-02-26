"""
SecurePipeline Hub - Intentionally Vulnerable Test Application
WARNING: FOR TESTING ONLY - DO NOT DEPLOY TO PRODUCTION
Contains: SQL Injection, XSS, Hardcoded Secrets, Insecure Config
"""

from flask import Flask, request, render_template_string
import sqlite3

app = Flask(__name__)

# VULNERABILITY 1: Hardcoded Secrets (GitLeaks should catch this)
API_KEY = "super_secret_key_12345"  # Line 9
DATABASE_PASSWORD = "admin123"      # Line 10
AWS_SECRET = "AKIAIOSFODNN7EXAMPLE"  # Line 11

@app.route('/')
def home():
    """Main page with links to vulnerable endpoints"""
    return """
    <html>
    <head>
        <title>SecurePipeline Hub - Test Application</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            h1 { color: #333; }
            .vulnerability { 
                background: #fff;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 10px 0;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            a { color: #007bff; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .warning {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 12px;
                border-radius: 4px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <h1>🔓 SecurePipeline Hub - Vulnerable Test Application</h1>
        
        <div class="warning">
            <strong>⚠️ WARNING:</strong> This application contains intentional security vulnerabilities for testing purposes only.
            Never deploy to production!
        </div>
        
        <p>This application is designed to test the SecurePipeline Hub security scanners.</p>
        
        <h2>Test Endpoints:</h2>
        
        <div class="vulnerability">
            <h3>1. SQL Injection Test</h3>
            <p><strong>Normal:</strong> <a href="/search?name=test">Search for "test"</a></p>
            <p><strong>Exploit:</strong> <a href="/search?name=' OR '1'='1">SQL Injection Attack</a></p>
            <p><em>Expected: Semgrep (SAST) detection</em></p>
        </div>
        
        <div class="vulnerability">
            <h3>2. Cross-Site Scripting (XSS) Test</h3>
            <p><strong>Normal:</strong> <a href="/greet?user=John">Greet "John"</a></p>
            <p><strong>Exploit:</strong> <a href="/greet?user=<script>alert('XSS')</script>">XSS Attack</a></p>
            <p><em>Expected: Semgrep (SAST) detection</em></p>
        </div>
        
        <div class="vulnerability">
            <h3>3. Path Traversal Test</h3>
            <p><strong>Normal:</strong> <a href="/file?path=test.txt">Read test.txt</a></p>
            <p><strong>Exploit:</strong> <a href="/file?path=../requirements.txt">Path Traversal</a></p>
            <p><em>Expected: Semgrep (SAST) detection</em></p>
        </div>
        
        <div class="vulnerability">
            <h3>4. Command Injection Test</h3>
            <p><strong>Normal:</strong> <a href="/ping?host=localhost">Ping localhost</a></p>
            <p><strong>Exploit:</strong> <a href="/ping?host=localhost;dir">Command Injection (Windows)</a></p>
            <p><em>Expected: Semgrep (SAST) detection</em></p>
        </div>
        
        <h3>Additional Vulnerabilities:</h3>
        <ul>
            <li><strong>Hardcoded Secrets:</strong> API_KEY, DATABASE_PASSWORD, AWS_SECRET in source code (Line 9-11)
                <br><em>Expected: GitLeaks detection</em></li>
            <li><strong>Vulnerable Dependencies:</strong> Flask==2.0.1 contains CVE-2023-30861
                <br><em>Expected: OWASP Dependency-Check detection</em></li>
            <li><strong>Insecure Configuration:</strong> Debug mode enabled, bound to 0.0.0.0 (Line 125)
                <br><em>Expected: Semgrep (SAST) detection</em></li>
        </ul>
        
        <hr>
        <p style="color: #666; font-size: 0.9em;">
            <strong>Total Vulnerabilities:</strong> 7 | 
            <strong>Expected Detections:</strong> Semgrep (5), GitLeaks (3), Dependency-Check (1)
        </p>
    </body>
    </html>
    """

# VULNERABILITY 2: SQL Injection (Semgrep should catch this)
@app.route('/search')
def search():
    """SQL Injection vulnerability - string concatenation in query"""
    name = request.args.get('name', '')
    
    # Create in-memory database for demo
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()
    
    # Create test table with sample data
    cursor.execute('CREATE TABLE users (id INTEGER, name TEXT, email TEXT)')
    cursor.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com')")
    cursor.execute("INSERT INTO users VALUES (2, 'Bob', 'bob@example.com')")
    cursor.execute("INSERT INTO users VALUES (3, 'Charlie', 'charlie@example.com')")
    cursor.execute("INSERT INTO users VALUES (4, 'test', 'test@example.com')")
    
    # VULNERABLE: String concatenation in SQL query (Line 116)
    query = f"SELECT * FROM users WHERE name = '{name}'"
    
    try:
        cursor.execute(query)
        results = cursor.fetchall()
        
        html = "<h2>Search Results:</h2>"
        html += f"<p><strong>Query executed:</strong> <code>{query}</code></p>"
        
        if results:
            html += "<ul>"
            for row in results:
                html += f"<li>ID: {row[0]}, Name: {row[1]}, Email: {row[2]}</li>"
            html += "</ul>"
        else:
            html += "<p>No results found.</p>"
            
        html += '<br><a href="/">← Back to Home</a>'
        
        return html
    except Exception as e:
        return f"<h2>Database Error:</h2><p>{str(e)}</p><br><a href='/'>← Back</a>"
    finally:
        conn.close()

# VULNERABILITY 3: Cross-Site Scripting (XSS) (Semgrep should catch this)
@app.route('/greet')
def greet():
    """XSS vulnerability - unsanitized template rendering"""
    user = request.args.get('user', 'Guest')
    
    # VULNERABLE: Unsanitized user input in template (Line 148)
    template = f"""
    <html>
    <head>
        <title>Greeting</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            h1 {{ color: #2c3e50; }}
        </style>
    </head>
    <body>
        <h1>Hello, {user}!</h1>
        <p>Welcome to our vulnerable application.</p>
        <p>This page demonstrates an XSS vulnerability where user input is not sanitized.</p>
        <br><a href="/">← Back to Home</a>
    </body>
    </html>
    """
    
    return render_template_string(template)

# VULNERABILITY 4: Path Traversal
@app.route('/file')
def read_file():
    """Path traversal vulnerability"""
    filepath = request.args.get('path', 'test.txt')
    
    # VULNERABLE: No path validation (Line 177)
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        return f"<h2>File Content:</h2><pre>{content}</pre><br><a href='/'>← Back</a>"
    except Exception as e:
        return f"<h2>Error Reading File:</h2><p>{str(e)}</p><br><a href='/'>← Back</a>"

# VULNERABILITY 5: Command Injection
@app.route('/ping')
def ping():
    """Command injection vulnerability"""
    host = request.args.get('host', 'localhost')
    
    # VULNERABLE: Unsanitized command execution (Line 191)
    import os
    # Windows: use 'dir' instead of 'ls' for command injection demo
    result = os.popen(f'ping -n 1 {host}').read()
    
    return f"<h2>Ping Result:</h2><pre>{result}</pre><br><a href='/'>← Back</a>"

# VULNERABILITY 6: Insecure Configuration (Semgrep should catch this)
if __name__ == '__main__':
    # VULNERABLE: Debug mode in production, exposed to all interfaces (Line 201)
    print("=" * 60)
    print("🔓 Starting Vulnerable Test Application")
    print("=" * 60)
    print("⚠️  WARNING: This application has intentional vulnerabilities!")
    print("⚠️  FOR TESTING ONLY - DO NOT DEPLOY TO PRODUCTION")
    print("=" * 60)
    print(f"🌐 Access at: http://localhost:5000")
    print(f"📊 Total Vulnerabilities: 7")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)