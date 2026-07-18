:

#!/bin/bash
set -euo pipefail

printf '%s\n' '--- Markdown documentation files ---'
fd -t f -e md . | sort

printf '%s\n' '--- Terraform-related files and references ---'
fd -t f . | rg -i '(^|/)(terraform|.*\.tf|.*tfvars|.*workflow.*)$' || true
rg -n -i -C 3 '\bterraform\b' README.md test 2>/dev/null || true

printf '%s\n' '--- TerraformWorkflow test outline and contents ---'
test_file="$(fd -t f '^TerraformWorkflow\.spec\.ts$' test | head -n 1)"
if [ -n "$test_file" ]; then
  ast-grep outline "$test_file" --items all
  cat -n "$test_file"
fi