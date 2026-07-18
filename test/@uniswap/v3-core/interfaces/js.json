import { expect } from 'chai'
import fs from 'fs'
import path from 'path'

// This spec validates the content and structure of the newly added
// `.github/workflows/Terraform.md` file. The file documents (and embeds) the
// standard `hashicorp/setup-terraform` example GitHub Actions workflow. Since
// it uses the `.md` extension rather than `.yml`/`.yaml`, GitHub Actions will
// not execute it as a live workflow; these tests guard the documented
// structure so that regressions (e.g. accidental edits that break the
// embedded workflow example, or an accidental rename to `.yml` that would
// activate an untested workflow) are caught.

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'Terraform.md')

describe('.github/workflows/Terraform.md', () => {
  let contents: string
  let lines: string[]

  before(() => {
    contents = fs.readFileSync(WORKFLOW_PATH, 'utf8')
    lines = contents.split('\n')
  })

  describe('file presence', () => {
    it('exists on disk', () => {
      expect(fs.existsSync(WORKFLOW_PATH)).to.eq(true)
    })

    it('is not empty', () => {
      expect(contents.trim().length).to.be.greaterThan(0)
    })

    it('uses the .md extension, so it will not be picked up as a live GitHub Actions workflow', () => {
      // GitHub Actions only executes files with a .yml/.yaml extension inside
      // .github/workflows. Documenting this explicitly protects against a
      // change that silently renames the file and activates an untested
      // workflow (e.g. one that could auto-apply Terraform on push to main).
      expect(path.extname(WORKFLOW_PATH)).to.eq('.md')
    })
  })

  describe('documentation header', () => {
    it('explains what the workflow does', () => {
      expect(contents).to.include('This workflow installs the latest version of Terraform CLI')
      expect(contents).to.include('terraform apply` will be executed')
    })

    it('links to the hashicorp/setup-terraform documentation', () => {
      expect(contents).to.include('https://github.com/hashicorp/setup-terraform')
    })

    it('documents the required `main.tf` remote backend setup step', () => {
      expect(contents).to.include('Create a `main.tf` file')
      expect(contents).to.include('backend "remote"')
      expect(contents).to.include('organization = "example-organization"')
      expect(contents).to.include('name = "example-workspace"')
    })

    it('documents how to create and store the Terraform Cloud API token secret', () => {
      expect(contents).to.include('Generate a Terraform Cloud user API token')
      expect(contents).to.include('TF_API_TOKEN')
      expect(contents).to.include('https://www.terraform.io/docs/cloud/users-teams-organizations/api-tokens.html')
    })
  })

  describe('workflow metadata', () => {
    it('sets the workflow name to Terraform', () => {
      expect(contents).to.match(/^name: 'Terraform'$/m)
    })

    it('triggers on push to main', () => {
      expect(contents).to.match(/on:\n\s+push:\n\s+branches: \[\s*"main"\s*\]/)
    })

    it('triggers on pull_request', () => {
      expect(contents).to.match(/pull_request:\s*$/m)
    })

    it('restricts default permissions to read-only contents access', () => {
      expect(contents).to.match(/permissions:\n\s+contents: read/)
    })
  })

  describe('terraform job', () => {
    it('defines a job named terraform running on ubuntu-latest', () => {
      expect(contents).to.match(/jobs:\n\s+terraform:/)
      expect(contents).to.include('runs-on: ubuntu-latest')
    })

    it('runs in the production environment', () => {
      expect(contents).to.include('environment: production')
    })

    it('defaults to the bash shell for run steps', () => {
      expect(contents).to.match(/defaults:\n\s+run:\n\s+shell: bash/)
    })
  })

  describe('workflow steps', () => {
    const expectedStepOrder = [
      'Checkout',
      'Setup Terraform',
      'Terraform Init',
      'Terraform Format',
      'Terraform Plan',
      'Terraform Apply',
    ]

    it('defines every expected step, in order', () => {
      // The `steps:` key only appears once, marking the start of the actual
      // job definition. Searching from this point avoids false matches
      // against the "Setup Terraform" example shown in the documentation
      // header comment above the workflow definition.
      const stepsSectionIndex = contents.indexOf('steps:')
      expect(stepsSectionIndex).to.be.greaterThan(-1)
      const stepsSection = contents.slice(stepsSectionIndex)

      const indices = expectedStepOrder.map((step) => stepsSection.indexOf(`- name: ${step}`))

      // every step must be present
      indices.forEach((index, i) => {
        expect(index, `expected to find step "${expectedStepOrder[i]}"`).to.be.greaterThan(-1)
      })

      // steps must appear in the documented order
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).to.be.greaterThan(indices[i - 1])
      }
    })

    it('checks out the repository using actions/checkout@v4', () => {
      expect(contents).to.include('uses: actions/checkout@v4')
    })

    it('configures Terraform CLI credentials via hashicorp/setup-terraform@v1', () => {
      expect(contents).to.include('uses: hashicorp/setup-terraform@v1')
      expect(contents).to.include('cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}')
    })

    it('runs terraform init', () => {
      expect(contents).to.match(/name: Terraform Init\s*\n\s*run: terraform init/)
    })

    it('runs terraform fmt -check', () => {
      expect(contents).to.match(/name: Terraform Format\s*\n\s*run: terraform fmt -check/)
    })

    it('runs terraform plan with input disabled', () => {
      expect(contents).to.match(/name: Terraform Plan\s*\n\s*run: terraform plan -input=false/)
    })

    it('only applies on push events, gated by an explicit if condition', () => {
      const applyBlockMatch = contents.match(
        /name: Terraform Apply\s*\n\s*if: (.+)\s*\n\s*run: terraform apply -auto-approve -input=false/
      )
      expect(applyBlockMatch, 'expected to find a conditional Terraform Apply step').to.not.eq(null)
      const condition = applyBlockMatch![1]
      expect(condition).to.include("github.event_name == 'push'")
      expect(condition).to.include('github.ref ==')
    })
  })

  describe('structural sanity checks', () => {
    it('has no unresolved template placeholders (e.g. TODO/FIXME)', () => {
      expect(contents).to.not.match(/TODO|FIXME|CHANGEME/)
    })

    it('only references the TF_API_TOKEN secret', () => {
      const secretReferences = [...contents.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((match) => match[1])
      const uniqueSecretReferences = [...new Set(secretReferences)]
      expect(uniqueSecretReferences).to.deep.eq(['TF_API_TOKEN'])
    })

    it('keeps step list indentation consistent under the steps: key', () => {
      const stepsIndex = lines.findIndex((line) => line.trim() === 'steps:')
      expect(stepsIndex).to.be.greaterThan(-1)

      const stepNameLines = lines.slice(stepsIndex + 1).filter((line) => line.includes('- name:'))
      expect(stepNameLines.length).to.eq(6)
      stepNameLines.forEach((line) => {
        expect(line.startsWith('    - name:'), `unexpected indentation for line: ${JSON.stringify(line)}`).to.eq(
          true
        )
      })
    })
  })

  describe('consistency with existing terraform workflow files', () => {
    it('matches the pre-existing lowercase terraform.md documentation file', () => {
      const lowercasePath = path.join(__dirname, '..', '.github', 'workflows', 'terraform.md')
      // On case-sensitive filesystems (e.g. Linux CI runners) these are two
      // distinct files; on case-insensitive filesystems (e.g. default macOS
      // or Windows checkouts) they resolve to the same file on disk. Either
      // way, their documented content should stay in sync.
      if (fs.existsSync(lowercasePath) && fs.realpathSync(lowercasePath) !== fs.realpathSync(WORKFLOW_PATH)) {
        const lowercaseContents = fs.readFileSync(lowercasePath, 'utf8')
        expect(contents.trim()).to.eq(lowercaseContents.trim())
      }
    })
  })
})