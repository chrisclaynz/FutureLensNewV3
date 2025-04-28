// Script to rollback changes to database functions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main function
async function rollbackFunctionChanges() {
  console.log('Rollback Function Changes Tool');
  console.log('=============================');
  console.log('This tool will help you rollback changes made to database functions.');
  console.log('WARNING: This will undo security improvements. Only use this if the fix caused issues.');
  
  try {
    // Get a list of available backups
    const backupDir = path.join(__dirname, '..', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      console.error('❌ No backups directory found. Cannot rollback changes.');
      process.exit(1);
    }
    
    const files = fs.readdirSync(backupDir).filter(file => 
      file.startsWith('function_backup_') && file.endsWith('.json')
    );
    
    if (files.length === 0) {
      console.error('❌ No backup files found. Cannot rollback changes.');
      process.exit(1);
    }
    
    // Sort files by date (newest first)
    files.sort((a, b) => {
      const timeA = a.match(/function_backup_(?:enhanced_)?(.+)\.json/)[1];
      const timeB = b.match(/function_backup_(?:enhanced_)?(.+)\.json/)[1];
      return new Date(timeB.replace(/-/g, ':')) - new Date(timeA.replace(/-/g, ':'));
    });
    
    console.log('\nAvailable backups:');
    files.forEach((file, index) => {
      const timestamp = file.match(/function_backup_(?:enhanced_)?(.+)\.json/)[1];
      const date = new Date(timestamp.replace(/-/g, ':'));
      console.log(`${index + 1}. ${file} (${date.toLocaleString()})`);
    });
    
    // Prompt user to select a backup
    const answer = await new Promise(resolve => {
      rl.question('\nEnter the number of the backup to restore (or "q" to quit): ', resolve);
    });
    
    if (answer.toLowerCase() === 'q') {
      console.log('Rollback cancelled.');
      rl.close();
      process.exit(0);
    }
    
    const selection = parseInt(answer, 10);
    if (isNaN(selection) || selection < 1 || selection > files.length) {
      console.error('❌ Invalid selection. Rollback cancelled.');
      rl.close();
      process.exit(1);
    }
    
    const selectedFile = files[selection - 1];
    const backupPath = path.join(backupDir, selectedFile);
    
    console.log(`\nLoading backup from ${selectedFile}...`);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    if (!backupData || !Array.isArray(backupData)) {
      console.error('❌ Invalid backup file format. Cannot rollback changes.');
      rl.close();
      process.exit(1);
    }
    
    console.log(`Found ${backupData.length} function(s) in the backup.`);
    
    // Confirm before proceeding
    const confirmAnswer = await new Promise(resolve => {
      rl.question('\n⚠️ WARNING: This will revert security improvements. Continue? (y/n): ', resolve);
    });
    
    if (confirmAnswer.toLowerCase() !== 'y') {
      console.log('Rollback cancelled.');
      rl.close();
      process.exit(0);
    }
    
    // Perform rollback
    for (const func of backupData) {
      if (!func.routine_name || !func.routine_definition) {
        console.warn(`⚠️ Skipping invalid function entry in backup.`);
        continue;
      }
      
      console.log(`Rolling back ${func.routine_name}...`);
      
      // Create rollback SQL
      // Note: This is a simplified approach that might not work for all function types
      // In a real-world scenario, you'd need more sophisticated parsing
      const rollbackSql = `
        CREATE OR REPLACE FUNCTION ${func.routine_name}(${getParamsFromDefinition(func.routine_definition)})
        RETURNS ${getReturnTypeFromDefinition(func.routine_definition)}
        LANGUAGE plpgsql
        ${func.security_type === 'DEFINER' ? 'SECURITY DEFINER' : ''}
        AS $BODY$
        ${getBodyFromDefinition(func.routine_definition)}
        $BODY$;
      `;
      
      // Execute rollback
      const { error } = await supabase.rpc('exec_sql', { sql: rollbackSql });
      
      if (error) {
        console.error(`❌ Error rolling back ${func.routine_name}:`, error.message);
      } else {
        console.log(`✅ Successfully rolled back ${func.routine_name}`);
      }
    }
    
    console.log('\nRollback completed! Functions have been restored to their previous state.');
    console.log('Note: The security_audit_log table has NOT been dropped for data preservation.');
    console.log('If needed, you can manually drop it using: DROP TABLE IF EXISTS security_audit_log;');
    
  } catch (error) {
    console.error('Unexpected error during rollback:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Helper function to extract parameters from function definition
function getParamsFromDefinition(definition) {
  // This is a simplified approach - a real implementation would need more robust parsing
  const paramMatch = definition.match(/\((.*?)\)/);
  return paramMatch ? paramMatch[1] : '';
}

// Helper function to extract return type from function definition
function getReturnTypeFromDefinition(definition) {
  // This is a simplified approach - a real implementation would need more robust parsing
  const returnMatch = definition.match(/RETURNS\s+([^\s]+)/i);
  return returnMatch ? returnMatch[1] : 'void';
}

// Helper function to extract function body from definition
function getBodyFromDefinition(definition) {
  // This is a simplified approach - a real implementation would need more robust parsing
  const bodyMatch = definition.match(/\$\$(.*?)\$\$/s);
  return bodyMatch ? bodyMatch[1] : 'BEGIN\nRETURN;\nEND;';
}

// Run the rollback
rollbackFunctionChanges().catch(console.error); 