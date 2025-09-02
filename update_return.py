#!/usr/bin/env python3

import re

# Read the current file
with open('/app/frontend/app/(tabs)/chats/index.tsx', 'r') as f:
    content = f.read()

# Read the new return statement
with open('/app/temp_return.txt', 'r') as f:
    new_return = f.read()

# Find the return statement and replace it
# The return statement starts with "  return (" and ends with "  );"
pattern = r'  return \(\s*<KeyboardAvoidingView.*?  \);'
replacement = new_return

# Use DOTALL flag to match across newlines
updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write the updated content back
with open('/app/frontend/app/(tabs)/chats/index.tsx', 'w') as f:
    f.write(updated_content)

print("Return statement updated successfully!")