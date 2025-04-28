// Script to analyze the exec_sql and check_tables_exist functions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key must be set in environment variables.');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Main analysis function
async function analyzeFunctions() {
  console.log('Analyzing database functions for search_path vulnerabilities...');
  
  try {
    // First, check if the functions exist
    const query = `
      SELECT 
        routine_name, 
        routine_schema, 
        routine_definition, 
        security_type,
        (SELECT setting FROM pg_settings WHERE name = 'search_path') as current_search_path
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('exec_sql', 'check_tables_exist');
    `;
    
    // Execute the query with the exec_sql function
    const { error: queryError, data } = await supabase.rpc('exec_sql', { sql: query });
    
    if (queryError) {
      console.error('Error executing query:', queryError.message);
      
      // Fallback to just checking if the function exists by trying to call it
      console.log('Trying to check if the functions exist by calling them...');
      
      // Try exec_sql
      const { error: execError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' }).catch(e => ({ error: e }));
      console.log('exec_sql function exists:', !execError);
      if (execError) {
        console.log('Error calling exec_sql:', execError.message);
      }
      
      // Try check_tables_exist
      const { error: checkError } = await supabase.rpc('check_tables_exist', {}).catch(e => ({ error: e }));
      console.log('check_tables_exist function exists:', !checkError);
      if (checkError) {
        console.log('Error calling check_tables_exist:', checkError.message);
      }
      
      // Search for function usage in codebase
      console.log('\nSearching codebase for function usage...');
      searchCodebaseForFunctionUsage('exec_sql');
      searchCodebaseForFunctionUsage('check_tables_exist');
      
      return;
    }
    
    // Log the findings to a report file
    const reportPath = path.join(__dirname, '..', 'function_analysis_report.md');
    let report = '# Database Function Analysis Report\n\n';
    report += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    report += '## Function Status:\n\n';
    if (data && data.length > 0) {
      data.forEach(func => {
        report += `### Function: \`${func.routine_name}\`\n`;
        report += `- Schema: ${func.routine_schema}\n`;
        report += `- Security Type: ${func.security_type}\n`;
        report += `- Current Search Path: ${func.current_search_path}\n`;
        report += '- Definition:\n```sql\n';
        report += func.routine_definition;
        report += '\n```\n\n';
      });
    } else {
      report += '- No functions found matching the criteria.\n\n';
    }
    
    // Search for function usage in codebase
    console.log('\nSearching codebase for function usage...');
    const execUsage = searchCodebaseForFunctionUsage('exec_sql');
    const checkUsage = searchCodebaseForFunctionUsage('check_tables_exist');
    
    report += '## Function Usage in Codebase:\n\n';
    report += '### exec_sql Usage:\n';
    if (execUsage.length > 0) {
      execUsage.forEach(usage => {
        report += `- ${usage.file} (Line ${usage.line}): ${usage.text.trim()}\n`;
      });
    } else {
      report += '- No usage found in codebase.\n';
    }
    
    report += '\n### check_tables_exist Usage:\n';
    if (checkUsage.length > 0) {
      checkUsage.forEach(usage => {
        report += `- ${usage.file} (Line ${usage.line}): ${usage.text.trim()}\n`;
      });
    } else {
      report += '- No usage found in codebase.\n';
    }
    
    // Risk assessment
    report += '\n## Vulnerability Assessment:\n\n';
    report += '### exec_sql Function:\n';
    report += '- **Severity**: High\n';
    report += '- **Risk**: This function can execute arbitrary SQL, which could be exploited for SQL injection attacks if not properly secured.\n';
    report += '- **Recommendation**: Set a fixed search path using `SET search_path = public` to prevent search path injection attacks.\n\n';
    
    report += '### check_tables_exist Function:\n';
    report += '- **Severity**: Medium\n';
    report += '- **Risk**: The function may access tables in schemas controlled by an attacker if the search path is manipulated.\n';
    report += '- **Recommendation**: Set a fixed search path using `SET search_path = public` to prevent search path injection attacks.\n\n';
    
    // Write the report
    fs.writeFileSync(reportPath, report);
    console.log(`Analysis completed! Report saved to ${reportPath}`);
    
  } catch (error) {
    console.error('Unexpected error during analysis:', error.message);
    process.exit(1);
  }
}

// Helper function to search for function usage in codebase
function searchCodebaseForFunctionUsage(functionName) {
  const results = [];
  const rootDir = path.join(__dirname, '..');
  const ignoreDirectories = ['node_modules', '.git'];
  
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip ignored directories
        if (ignoreDirectories.includes(file)) continue;
        searchDir(filePath);
      } else if (stat.isFile() && 
                (file.endsWith('.js') || file.endsWith('.sql') || file.endsWith('.html'))) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (line.includes(functionName)) {
              results.push({
                file: path.relative(rootDir, filePath),
                line: index + 1,
                text: line
              });
            }
          });
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error.message);
        }
      }
    }
  }
  
  console.log(`Searching for usage of ${functionName}...`);
  searchDir(rootDir);
  console.log(`Found ${results.length} occurrences of ${functionName}`);
  
  return results;
}

// Run the analysis
analyzeFunctions().catch(console.error); 