import { expect } from 'chai'
import fs from 'fs'
import path from 'path'

// This suite validates the content of the Terraform GitHub Actions workflow
// documentation added at `.github/workflows/Terraform.md`. The file is a
// Markdown document (not a `.yml`/`.yaml` file), so GitHub Actions will not
// execute it as a live workflow; it only documents an example workflow that
// consumers can copy into their own `.yml` file. These tests assert that the
// documented example retains the exact structure/content described in the PR.

const WORKFLOW_DOC_PATH = path.join(__dirname, '..', '.github', 'workflows', 'Terraform.md')

describe('.github/workflows/Terraform.md', () => {
  let content: string

  before('read workflow documentation file', () => {
    content = fs.readFileSync(WORKFLOW_DOC_PATH, 'utf8')
  })

  it('exists at the expected path', () => {
    expect(fs.existsSync(WORKFLOW_DOC_PATH)).to.be.true
  })

  it('is not a live workflow file (uses a .md extension, not .yml/.yaml)', () => {
    expect(path.extname(WORKFLOW_DOC_PATH)).to.eq('.md')
    expect(WORKFLOW_DOC_PATH).to.not.match(/\.ya?ml$/)
  })

  describe('documentation header', () => {
    it('explains what the workflow does', () => {
      expect(content).to.include('This workflow installs the latest version of Terraform CLI')
      expect(content).to.include('Terraform Cloud (app.terraform.io)')
    })

    it('links to the hashicorp/setup-terraform documentation', () => {
      expect(content).to.include('https://github.com/hashicorp/setup-terraform')
    })

    it('documents the three required setup steps', () => {
      expect(content).to.match(/#\s*1\. Create a `main\.tf` file/)
      expect(content).to.match(/#\s*2\. Generate a Terraform Cloud user API token/)
      expect(content).to.match(/#\s*3\. Reference the GitHub secret in step/)
    })

    it('includes an example main.tf using the remote backend', () => {
      expect(content).to.include('backend "remote"')
      expect(content).to.include('organization = "example-organization"')
      expect(content).to.include('resource "null_resource" "example"')
    })

    it('references the TF_API_TOKEN secret consistently', () => {
      const matches = content.match(/secrets\.TF_API_TOKEN/g) ?? []
      expect(matches.length).to.be.at.least(2)
    })

    it('does not leak an actual secret value in place of the token reference', () => {
      expect(content).to.not.match(/cli_config_credentials_token:\s*(?!\$\{\{)\S/)
    })
  })

  describe('workflow metadata', () => {
    it('names the workflow "Terraform"', () => {
      expect(content).to.match(/^name: 'Terraform'$/m)
    })

    it('triggers on push to main', () => {
      expect(content).to.match(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[\s*"main"\s*\]/)
    })

    it('triggers on pull_request events', () => {
      expect(content).to.match(/pull_request:\s*$/m)
    })

    it('restricts default permissions to read-only contents access', () => {
      expect(content).to.match(/permissions:\s*\n\s*contents:\s*read/)
    })
  })

  describe('terraform job', () => {
    it('runs on ubuntu-latest with the production environment', () => {
      expect(content).to.match(/runs-on:\s*ubuntu-latest/)
      expect(content).to.match(/environment:\s*production/)
    })

    it('defaults to the bash shell for all run steps', () => {
      expect(content).to.match(/defaults:\s*\n\s*run:\s*\n\s*shell:\s*bash/)
    })

    it('checks out the repository using actions/checkout@v4', () => {
      expect(content).to.match(/name:\s*Checkout\s*\n\s*uses:\s*actions\/checkout@v4/)
    })

    it('configures the Terraform CLI using hashicorp/setup-terraform@v1', () => {
      expect(content).to.match(
        /name:\s*Setup Terraform\s*\n\s*uses:\s*hashicorp\/setup-terraform@v1\s*\n\s*with:\s*\n\s*cli_config_credentials_token:\s*\$\{\{\s*secrets\.TF_API_TOKEN\s*\}\}/
      )
    })

    it('runs "terraform init" for the Terraform Init step', () => {
      expect(content).to.match(/name:\s*Terraform Init\s*\n\s*run:\s*terraform init/)
    })

    it('runs "terraform fmt -check" for the Terraform Format step', () => {
      expect(content).to.match(/name:\s*Terraform Format\s*\n\s*run:\s*terraform fmt -check/)
    })

    it('runs "terraform plan -input=false" for the Terraform Plan step', () => {
      expect(content).to.match(/name:\s*Terraform Plan\s*\n\s*run:\s*terraform plan -input=false/)
    })

    it('runs "terraform apply" only on push to main, gated by an if condition', () => {
      expect(content).to.match(/name:\s*Terraform Apply/)
      expect(content).to.match(
        /if:\s*github\.ref == 'refs\/heads\/"main"' && github\.event_name == 'push'/
      )
      expect(content).to.match(/run:\s*terraform apply -auto-approve -input=false/)
    })

    it('orders the steps as: Checkout, Setup Terraform, Init, Format, Plan, Apply', () => {
      // Scope the search to the `steps:` block of the job, since the file's
      // documentation header also contains an example snippet referencing
      // "name: Setup Terraform" that would otherwise be matched first.
      const stepsSectionIndex = content.indexOf('steps:')
      expect(stepsSectionIndex).to.be.greaterThan(-1)
      const stepsSection = content.slice(stepsSectionIndex)

      const stepNames = ['Checkout', 'Setup Terraform', 'Terraform Init', 'Terraform Format', 'Terraform Plan', 'Terraform Apply']
      const indexes = stepNames.map((stepName) => stepsSection.indexOf(`name: ${stepName}`))

      indexes.forEach((index, i) => {
        expect(index, `expected to find step "${stepNames[i]}"`).to.be.greaterThan(-1)
      })

      for (let i = 1; i < indexes.length; i++) {
        expect(indexes[i], `expected "${stepNames[i]}" to appear after "${stepNames[i - 1]}"`).to.be.greaterThan(
          indexes[i - 1]
        )
      }
    })
  })
})